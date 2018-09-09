//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

let isIdentifier = s => /^[a-z_][a-z_0-9-]*$/i.test(s);
isIdentifier.exp = 'a valid identifier';

let isString = s => typeof s === 'string';
isString.exp = 'a string';

let isNumber = n => typeof n === 'number';
isNumber.exp = 'a number';
let isPeriod = isNumber;

let isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

let each = vf => {
  let v = a => Array.isArray(a) && a.every(e => vf(e));
  v.exp = `each is ${vf.exp}`;
  return v;
};

//////////////////////////////////////////////////////////////////////////////
// Every command takes 2 parameters:
//   1. context = { cp, tl, ct, scope }
//   where
//      cp is the command parser (on demand)
//      tl is a traffic light
//      ct is a cancellation token
//      scope are the variable bindings for nested commands
//   2. params = [v1, v2, ..., vn]
//      v1...vn are the values of the command parameters
//////////////////////////////////////////////////////////////////////////////

let {Cancellable} = require('./cancellable');

// Default Cancellation Token used for all commands
let cancellable = new Cancellable;

// Cancels all commands that are being executed in the context of a
// Cancellation Token.
function cancel({ct = cancellable} = {}) {
  if (ct.isCancelled) return;
  ct.cancel();
  if (ct === cancellable) {
    cancellable = new Cancellable;
  }
}
cancel.paramNames = []; // no parameters
cancel.validation = []; // validates number of parameters (zero)
cancel.doc = {
  name: 'cancel',
  desc: 'Cancels all executing commands.'
};

//////////////////////////////////////////////////////////////////////////////

function define({cp}, [name, desc, command]) {
  return cp.define(name, command, desc);
}
define.doc = {
  name: 'define',
  desc: 'Defines a new command, where variables become parameters:\n' +
        '(define burst "Burst of light" (twinkle :light 50))'
};
define.paramNames = ['name', 'desc', 'command'];
define.validation = [isIdentifier, isString, isCommand];
define.usesParser = true; // receives the cp (command parser) parameter

//////////////////////////////////////////////////////////////////////////////

// Pauses execution for the given duration.
// Returns a Promise that resolves when the pause duration is complete,
// or if it's cancelled. Even if the pause is cancelled, the Promise
// is resolved, never rejected.
function pause(ctx, params) {
  // allow the first parameter to be omitted
  // => pause({ct}, [500]) OR pause([500])
  let ct = ctx.ct || cancellable;
  if (ct.isCancelled) return;
  let [ms] = params || ctx;
  return new Promise(resolve => {
    let timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms);
    ct.add(timeoutID, resolve);
  });
}
pause.paramNames = ['ms'];
pause.validation = [isPeriod];
pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration in milliseconds:\n' +
        '(pause 500)'
};

//////////////////////////////////////////////////////////////////////////////

// Executes a command with a timeout
async function timeout({tl, ct = cancellable, scope = {}}, [ms, command]) {
  let timeoutC = new Cancellable;
  let timeoutP = pause({ct}, [ms]);
  // race the cancellable-command against the timeout
  let res = await Promise.race([command({tl, ct: timeoutC, scope}), timeoutP]);
  // check if the timeout was reached
  // 42 is arbitrary, but it CAN'T be the value returned by timeoutP
  let value = await Promise.race([timeoutP, 42]);
  if (value !== 42 || ct.isCancelled) {
    // the timeout was reached (value !== 42) OR the timeout was cancelled
    timeoutC.cancel();
  }
  return res;
}
timeout.paramNames = ['ms', 'command'];
timeout.validation = [isPeriod, isCommand];
timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout:\n' +
        '(timeout 5000 (twinkle red 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function run({tl, ct = cancellable, scope = {}}, [commands]) {
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
    await command({tl, ct, scope});
  }
}
run.transformation = args => [args];
run.paramNames = ['commands'];
run.validation = [each(isCommand)];
run.doc = {
  name: 'run',
  desc: 'Executes the given commands in sequence:\n' +
        '(run (toggle red) (pause 1000) (toggle red))'
};

//////////////////////////////////////////////////////////////////////////////

async function loop({tl, ct = cancellable, scope = {}}, [commands]) {
  if (!commands || commands.length === 0) return;
  while (true) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
loop.transformation = args => [args];
loop.paramNames = ['commands'];
loop.validation = [each(isCommand)];
loop.doc = {
  name: 'loop',
  desc: 'Executes the given commands in sequence, starting over forever:\n' +
        '(loop (toggle green) (pause 400) (toggle red) (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function repeat({tl, ct = cancellable, scope = {}}, [times, commands]) {
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
repeat.transformation = args => [args[0], args.slice(1)];
repeat.paramNames = ['times', 'commands'];
repeat.validation = [isNumber, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times:\n' +
        '(repeat 5 (toggle green) (pause 400) (toggle red) (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function all({tl, ct = cancellable, scope = {}}, [commands]) {
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({tl, ct, scope: {...scope}});
  }));
}
all.transformation = args => [args];
all.paramNames = ['commands'];
all.validation = [each(isCommand)];
all.doc = {
  name: 'all',
  desc: 'Executes the given commands in parallel, all at the same time:\n' +
        '(all (twinkle green 700) (twinkle yellow 300))'
};

//////////////////////////////////////////////////////////////////////////////
// Ease validation
//////////////////////////////////////////////////////////////////////////////

let Easing = {
  linear: t => t,
  easeIn: t => t*t,
  easeOut: t => t*(2-t),
  easeInOut: t => t<0.5 ? 2*t*t : -1+(4-2*t)*t
};

let isEasing = e => !!Easing[e];
isEasing.exp = `an easing function in ${Object.keys(Easing).join(', ')}`;

//////////////////////////////////////////////////////////////////////////////

async function ease({tl, ct = cancellable, scope = {}}, [easing, ms, what, from, to, command]) {
  let start = Date.now();
  let end = start + ms;
  let next = () => {
    let now = Date.now();
    let c = Easing[easing]((now - start) / ms);
    let curr = c * (to - from) + from;
    return curr | 0; // double -> int
  };
  // `[what]` is a "live" variable, so it's defined as a property
  Object.defineProperty(scope, what, {
    configurable: true, // allow the property to be deleted or redefined
    get: next,
    set: () => {} // no-op
  });
  while (true) {
    if (ct.isCancelled) break;
    let now = Date.now();
    let max = end - now;
    if (max <= 0) break;
    await timeout({tl, ct, scope}, [max, command]);
  }
}
ease.paramNames = ['easing', 'ms', 'what', 'from', 'to', 'command'];
ease.validation = [isEasing, isPeriod, isIdentifier, isNumber, isNumber, isCommand];
ease.doc = {
  name: 'ease',
  desc: 'Ease the `what` variable to `command`.\n' +
        'In the duration `ms`, go from `from` to `to` using the `easing` function:\n' +
        '(ease linear 10000 ms 50 200 (flash yellow :ms))'
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Traffic Light.
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////////////////////////////

let isOn = state =>
  (state === 'off' || state === 'false') ? false : !!state;

let turnLight = (oLight, state) =>
  oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

let isLight = l => l === 'red' || l === 'yellow' || l === 'green';
isLight.exp = '"red", "yellow" or "green"';

let isState = s => s === 'on' || s === 'off';
isState.exp = '"on" or "off"';

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct = cancellable}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.paramNames = ['light'];
toggle.validation = [isLight];
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light:\n(toggle green)'
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct = cancellable}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.paramNames = ['light', 'state'];
turn.validation = [isLight, isState];
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off:\n' +
        '(turn green on)'
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct = cancellable}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.paramNames = []; // no parameters
reset.validation = []; // validates number of parameters (zero)
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off.'
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  // base commands
  cancel, define,
  pause, timeout,
  run, loop, repeat, all, ease,
  // base traffic light commands
  toggle, turn, reset
};
