//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

const {
  isCommand,
  isMs,
  isSeconds,
  isMinutes,
  isTimes
} = require('./validation');

//////////////////////////////////////////////////////////////////////////////
// Busy-loop trap
//////////////////////////////////////////////////////////////////////////////
// It's OK for a command to have an infinite loop, as long as `pause` is
// called within the loop. If `pause` is not called, the loop is deemed a
// busy-loop, and would hang the main JavaScript thread.
//////////////////////////////////////////////////////////////////////////////

// trap busy loops: no calls to pause in an infinite loop-pass
class Trap {

  constructor() {
    // stores the total count of calls to `pause`
    this.count = 0;
  }

  // `pause` calls `inc()` to indicate it was called
  inc() {
    // with ~100ms pauses it would take 28.5 million years to reach Number.MAX_SAFE_INTEGER and fail
    // 9007199254740991(MAX_SAFE_INTEGER) * 100(ms) / 1000(s) / 60(min) / 60(h) / 24(d) / 365(y)
    ++this.count;
  }

  // marks the start of a loop-pass, remember the number of times `pause` was called
  mark() {
    this.cmp = this.count;
  }

  // checks at the end of a loop-pass if `pause` was called or not
  check(ct) {
    if (this.count === this.cmp) {
      // no calls to pause mean this is a busy-loop,
      // cancel it and raise an exception
      cancel({ct}); // calling `ct.cancel()` would not refresh the default `cancellable`
      throw new Error('Busy loop detected! Did you forget to call "pause"?');
    }
  }

}

const getTrap = ctx => ctx.$trap = ctx.$trap || new Trap();

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
cancel.meta = {
  name: 'cancel',
  params: [],
  desc: 'Cancels all executing commands.'
};

//////////////////////////////////////////////////////////////////////////////

// Pauses execution for the given duration.
// Returns a Promise that resolves when the pause duration is complete,
// or if it's cancelled. Even if the pause is cancelled, the Promise
// is resolved, never rejected.
function pause(ctx, [ms]) {
  getTrap(ctx).inc();
  const ct = ctx.ct || cancellable;
  if (ct.isCancelled) return;
  return new Promise(resolve => {
    const timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms);
    ct.add(timeoutID, resolve);
  });
}
pause.meta = {
  name: 'pause',
  params: [{ name: 'ms', validate: isMs }],
  desc: 'Pauses execution for the given duration in milliseconds.'
};

//////////////////////////////////////////////////////////////////////////////

// Executes a command with a timeout
async function timeout(ctx, [ms, command]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
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
timeout.meta = {
  name: 'timeout',
  params: [
    { name: 'ms', validate: isMs },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Executes a command with a timeout.
    @example
    (timeout 5000 (twinkle red 400))`
};

//////////////////////////////////////////////////////////////////////////////

function ms(ctx, [ms]) {
  return ms;
}
ms.meta = {
  name: 'ms',
  params: [{ name: 'ms', validate: isMs }],
  returns: isMs,
  desc: `Returns the given number of milliseconds (an identity function).`
};

function seconds(ctx, [sec]) {
  return sec * 1000;
}
seconds.meta = {
  name: 'seconds',
  params: [{ name: 'seconds', validate: isSeconds }],
  returns: isMs,
  desc: `Converts the given number of seconds to milliseconds.`
};

function minutes(ctx, [min]) {
  return min * 60 * 1000;
}
minutes.meta = {
  name: 'minutes',
  params: [{ name: 'minutes', validate: isMinutes }],
  returns: isMs,
  desc: `Converts the given number of minutes to milliseconds.`
};

//////////////////////////////////////////////////////////////////////////////

async function $do(ctx, [...commands]) {
  const {ct = cancellable, scope = {}} = ctx;
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    const command = commands[i];
    await command({...ctx, ct, scope});
  }
}
$do.meta = {
  name: 'do',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in sequence.
    @example
    (do
      (toggle red)
      (pause 1000)
      (toggle red))`
};

//////////////////////////////////////////////////////////////////////////////

// a single loop pass through a series of commands that checks for a busy-loop;
// returns `true` to break out of the loop, `false` to continue
// throws if it's a busy-loop in `trap.check()`
async function loopPass(ctx, commands) {
  const {ct = cancellable, scope = {}} = ctx;
  const trap = getTrap(ctx);
  trap.mark();
  if (ct.isCancelled) return true;
  await $do({...ctx, ct, scope}, commands);
  if (ct.isCancelled) return true;
  trap.check(ct);
  return false;
}

//////////////////////////////////////////////////////////////////////////////

async function loop(ctx, commands) {
  while (true) {
    if (await loopPass(ctx, commands)) return;
  }
}
loop.meta = {
  name: 'loop',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in sequence, starting over forever.
    @example
    (loop
      (toggle green)
      (pause 400)
      (toggle red)
      (pause 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function repeat(ctx, [times, ...commands]) {
  while (times-- > 0) {
    if (await loopPass(ctx, commands)) return;
  }
}
repeat.meta = {
  name: 'repeat',
  params: [
    { name: 'times', validate: isTimes },
    { name: 'command', validate: isCommand, isRest: true }
  ],
  desc: `
    Executes the commands in sequence, repeating the given number of times.
    @example
    (repeat 5
      (toggle green)
      (pause 400)
      (toggle red)
      (pause 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function all(ctx, [...commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({...ctx, ct, scope: {...scope}});
  }));
}
all.meta = {
  name: 'all',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in parallel, all at the same time.
    @example
    (all
      (twinkle green 700)
      (twinkle yellow 300))`
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const commands = {
  cancel,
  pause,
  timeout,
  ms, seconds, minutes,
  'do': $do,
  loop,
  repeat,
  all
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////
