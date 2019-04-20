//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

const {
  isIdentifier,
  isNumber,
  isGreaterThanZero,
  isPeriod,
  isCommand,
  each
} = require('./validation');

//////////////////////////////////////////////////////////////////////////////
// Base commands
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
async function timeout(ctx, [ms, command]) {
  let {ct = cancellable, scope = {}} = ctx;
  let timeoutC = new Cancellable;
  let timeoutP = pause({ct}, [ms]);
  // race the cancellable-command against the timeout
  let res = await Promise.race([command({...ctx, ct: timeoutC, scope}), timeoutP]);
  // check if the timeout was reached
  let racer = {}; // arbitrary object to race against the timeout
  let value = await Promise.race([timeoutP, racer]);
  if (value !== racer || ct.isCancelled) {
    // the timeout was reached (value !== racer) OR the timeout was cancelled
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

async function run(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
    await command({...ctx, ct, scope});
  }
}
run.transformation = args => [args];
run.paramNames = ['commands'];
run.validation = [each(isCommand)];
run.doc = {
  name: 'do',
  desc: 'Executes the given commands in sequence:\n' +
        '(do\n  (toggle red)\n  (pause 1000)\n  (toggle red))'
};

//////////////////////////////////////////////////////////////////////////////

async function loop(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (!commands || commands.length === 0) return;
  while (true) {
    if (ct.isCancelled) return;
    await run({...ctx, ct, scope}, [commands]);
  }
}
loop.transformation = args => [args];
loop.paramNames = ['commands'];
loop.validation = [each(isCommand)];
loop.doc = {
  name: 'loop',
  desc: 'Executes the given commands in sequence, starting over forever:\n' +
        '(loop\n  (toggle green)\n  (pause 400)\n  (toggle red)\n  (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function repeat(ctx, [times, commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await run({...ctx, ct, scope}, [commands]);
  }
}
repeat.transformation = args => [args[0], args.slice(1)];
repeat.paramNames = ['times', 'commands'];
repeat.validation = [isGreaterThanZero, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times:\n' +
        '(repeat 5\n  (toggle green)\n  (pause 400)\n  (toggle red)\n  (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function all(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({...ctx, ct, scope: {...scope}});
  }));
}
all.transformation = args => [args];
all.paramNames = ['commands'];
all.validation = [each(isCommand)];
all.doc = {
  name: 'all',
  desc: 'Executes the given commands in parallel, all at the same time:\n' +
        '(all\n  (twinkle green 700)\n  (twinkle yellow 300))'
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

async function ease(ctx, [easing, ms, what, from, to, command]) {
  let {ct = cancellable, scope = {}} = ctx;
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
    await timeout({...ctx, ct, scope}, [max, command]);
  }
}
ease.paramNames = ['easing', 'ms', 'what', 'from', 'to', 'command'];
ease.validation = [isEasing, isPeriod, isIdentifier, isNumber, isNumber, isCommand];
ease.doc = {
  name: 'ease',
  desc: "Ease the 'what' variable to 'command'.\n" +
        "In the duration 'ms', go from 'from' to 'to' using the 'easing' function:\n" +
        '(ease linear 10000 ms 50 200\n  (flash yellow :ms))'
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel,
  pause, timeout,
  'do': run,
  loop, repeat, all, ease
};
