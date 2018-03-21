/**
 * @file Defines commands to control a {@link TrafficLight}.
 *   The commands are usually time-based and are cancellable
 *   by a Cancellation Token. Cancellation Tokens are instances
 *   of {@link Cancellable}.
 */

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

let isIdentifier = s => /^[a-z_][a-z_0-9]*$/i.test(s);
isIdentifier.exp = 'a valid identifier';

let isNumber = n => typeof n === 'number';
isNumber.exp = 'a number';
let isPeriod = isNumber;

let isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

let each = vf => {
  let v = a => Array.isArray(a) && a.every(e => vf(e));
  v.exp = `each is ${vf.exp}`;
  return v;
}

//////////////////////////////////////////////////////////////////////////////
// Every command takes 2 parameters:
//   1. context = { tl, ct, scope }
//   where
//      tl is a traffic light
//      ct is a cancellation token
//      scope are the variable bindings for nested commands
//   2. params = [v1, v2, ..., vn]
//      v1...vn are the values of the command parameters
//////////////////////////////////////////////////////////////////////////////

let {Cancellable} = require('./cancellable');

/**
 * Default Cancellation Token used for all commands.
 * @private
 */
let cancellable = new Cancellable;

/**
 * Cancels all commands that are being executed in the context of a
 * Cancellation Token.
 */
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

/**
 * Pauses execution for the given duration.
 * @returns {Promise} Promise that resolves when the pause duration is complete,
 *   or if it's cancelled. Note that even if the pause is cancelled, the Promise
 *   is resolved, never rejected.
 */
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
    }, ms)
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

/**
 * Executes a command with a timeout.
 * @returns {Promise} The result of the command execution if the command
 *   finished before the timeout.
 */
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
timeout.paramNames = ["ms", "command"];
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
run.paramNames = ["commands"];
run.validation = [each(isCommand)];
run.doc = {
  name: 'run',
  desc: 'Executes the given commands in sequence:\n' +
        '(run (toggle red) (pause 1000) (toggle red))'
};

//////////////////////////////////////////////////////////////////////////////

async function loop({tl, ct = cancellable, scope = {}}, [commands]) {
  while (true) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
loop.transformation = args => [args];
loop.paramNames = ["commands"];
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
repeat.paramNames = ["times", "commands"];
repeat.validation = [isNumber, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times:\n' +
        '(repeat 5 (toggle green) (pause 400) (toggle red) (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function all({tl, ct = cancellable, scope = {}}, [commands]) {
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => command({tl, ct, scope})));
}
all.transformation = args => [args];
all.paramNames = ["commands"];
all.validation = [each(isCommand)];
all.doc = {
  name: 'all',
  desc: 'Executes the given commands in parallel, all at the same time:\n' +
        '(all (twinkle green 700) (twinkle yellow 300))'
};

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct = cancellable}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.paramNames = ["light"];
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
turn.paramNames = ["light", "state"];
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

function lights({tl, ct = cancellable}, [red, yellow, green]) {
  if (ct.isCancelled) return;
  turnLight(tl.red, red);
  turnLight(tl.yellow, yellow);
  turnLight(tl.green, green);
}
lights.paramNames = ["red", "yellow", "green"];
lights.validation = [isState, isState, isState];
lights.doc = {
  name: 'lights',
  desc: 'Set the lights to the given values (on or off):\n' +
        '(lights off off on)'
};

//////////////////////////////////////////////////////////////////////////////

let Easing = {
  linear: t => t,
  easeIn: t => t*t,
  easeOut: t => t*(2-t),
  easeInOut: t => t<.5 ? 2*t*t : -1+(4-2*t)*t
};
let isEasing = e => !!Easing[e];
isEasing.exp = `an easing function in ${Object.keys(Easing).join(', ')}`;

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
ease.paramNames = ["easing", "ms", "what", "from", "to", "command"];
ease.validation = [isEasing, isPeriod, isIdentifier, isNumber, isNumber, isCommand];
ease.doc = {
  name: 'ease',
  desc: 'Ease the `what` variable to `command`.\n' +
        'In the duration `ms`, go from `from` to `to` using the `easing` function:\n' +
        '(ease linear 10000 ms 50 200 (flash yellow :ms))'
};

//////////////////////////////////////////////////////////////////////////////
// Commands that use a Command Parser
//////////////////////////////////////////////////////////////////////////////

function define({cp}, [name, command]) {
  return cp.define(name, command);
}
define.doc = {
  name: 'define',
  desc: 'Defines a new command, variables in the command become parameters to the new command:\n' +
        '(define burst (twinkle :light 50))'
};
define.paramNames = ["name", "command"];
define.validation = [isIdentifier, isCommand];
define.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function flash({cp, tl, ct = cancellable, scope = {}}, [light, ms]) {
  await cp.execute(
    `run
      (toggle ${light}) (pause ${ms})
      (toggle ${light}) (pause ${ms})`,
    tl, ct, scope);
}
flash.doc = {
  name: 'flash',
  desc: 'Flashes a light for the given duration: toggle, wait, toggle back, wait again:\n' +
        '(flash red 500)'
};
flash.paramNames = ["light", "ms"];
flash.validation = [isLight, isPeriod];
flash.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function blink({cp, tl, ct = cancellable, scope = {}}, [light, ms, times]) {
  await cp.execute(
    `repeat ${times} (flash ${light} ${ms})`,
    tl, ct, scope);
}
blink.doc = {
  name: 'blink',
  desc: 'Flashes a light for the given duration and number of times:\n' +
        '(blink yellow 500 10)'
};
blink.paramNames = ["light", "ms", "times"];
blink.validation = [isLight, isPeriod, isNumber];
blink.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function twinkle({cp, tl, ct = cancellable, scope = {}}, [light, ms]) {
  await cp.execute(
    `loop (flash ${light} ${ms})`,
    tl, ct, scope);
}
twinkle.doc = {
  name: 'twinkle',
  desc: 'Flashes a light for the given duration forever:\n' +
        '(twinkle green 500)'
};
twinkle.paramNames = ["light", "ms"];
twinkle.validation = [isLight, isPeriod];
twinkle.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function cycle({cp, tl, ct = cancellable, scope = {}}, [ms, flashes]) {
  await cp.execute(
    `loop
      (blink red ${ms} ${flashes})
      (blink yellow ${ms} ${flashes})
      (blink green ${ms} ${flashes})`,
    tl, ct, scope);
}
cycle.doc = {
  name: 'cycle',
  desc: 'Blinks each light in turn for the given duration and number of times, ' +
        'repeating forever; starts with red:\n' +
        '(cycle 500 2)'
};
cycle.paramNames = ["ms", "flashes"];
cycle.validation = [isPeriod, isNumber];
cycle.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function jointly({cp, tl, ct = cancellable, scope = {}}, [ms]) {
  await cp.execute(
    `loop
      (all
        (flash red ${ms})
        (flash yellow ${ms})
        (flash green ${ms}))`,
    tl, ct, scope);
}
jointly.doc = {
  name: 'jointly',
  desc: 'Flashes all lights together forever:\n(jointly 500)'
};
jointly.paramNames = ["ms"];
jointly.validation = [isPeriod];
jointly.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function heartbeat({cp, tl, ct = cancellable, scope = {}}, [light]) {
  await cp.execute(
    `loop
      (blink ${light} 250 2)
      (pause 350)`,
    tl, ct, scope);
}
heartbeat.doc = {
  name: 'heartbeat',
  desc: 'Heartbeat pattern:\n(heartbeat red)'
};
heartbeat.paramNames = ["light"];
heartbeat.validation = [isLight];
heartbeat.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function sos({cp, tl, ct = cancellable, scope = {}}, [light]) {
  await cp.execute(
    `loop
      (blink ${light} 150 3)
      (blink ${light} 250 2)
      (toggle ${light})
      (pause 250)
      (toggle ${light})
      (pause 150)
      (blink ${light} 150 3)
      (pause 700)`,
    tl, ct, scope);
}
sos.doc = {
  name: 'sos',
  desc: 'SOS distress signal morse code pattern:\n(sos red)'
};
sos.paramNames = ["light"];
sos.validation = [isLight];
sos.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function danger({cp, tl, ct = cancellable}) {
  await twinkle({cp, tl, ct}, ['red', 400]);
}
danger.doc = {
  name: 'danger',
  desc: 'Danger: twinkle red with 400ms flashes.'
};
danger.paramNames = []; // no parameters
danger.validation = []; // validates number of parameters (zero)
danger.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function bounce({cp, tl, ct = cancellable, scope = {}}, [ms]) {
  await cp.execute(
    `loop
      (toggle green)  (pause ${ms}) (toggle green)
      (toggle yellow) (pause ${ms}) (toggle yellow)
      (toggle red)    (pause ${ms}) (toggle red)
      (toggle yellow) (pause ${ms}) (toggle yellow)`,
    tl, ct, scope);
}
bounce.doc = {
  name: 'bounce',
  desc: 'Bounces through the lights with the given duration between them:\n' +
        '(bounce 500)'
};
bounce.paramNames = ["ms"];
bounce.validation = [isPeriod];
bounce.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function soundbar({cp, tl, ct = cancellable, scope = {}}, [ms]) {
  await cp.execute(
    `loop
      (toggle green)  (pause ${ms})
      (toggle yellow) (pause ${ms})
      (toggle red)    (pause ${ms})
      (toggle red)    (pause ${ms})
      (toggle yellow) (pause ${ms})
      (toggle green)  (pause ${ms})`,
    tl, ct, scope);
}
soundbar.doc = {
  name: 'soundbar',
  desc: 'Soundbar: just like a sound bar with the given duration:\n' +
        '(soundbar 500)'
};
soundbar.paramNames = ["ms"];
soundbar.validation = [isPeriod];
soundbar.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

let commands = {
  cancel, pause, timeout,
  run, loop, repeat, all,
  toggle, turn, reset, lights,
  ease,
  define,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel, pause, timeout,
  run, loop, repeat, all,
  toggle, turn, reset, lights,
  ease,
  define,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar,
  published: commands
};
