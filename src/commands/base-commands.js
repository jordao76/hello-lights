//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

const {
  isNumber,
  isCommand
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
pause.meta = {
  name: 'pause',
  params: [{ name: 'ms', validate: isNumber }],
  desc: `Pauses execution for the given duration in milliseconds.`
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
    { name: 'ms', validate: isNumber },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Executes a command with a timeout.
    @example
    (timeout 5000 (twinkle red 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function $do(ctx, [...commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
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

async function loop(ctx, params) {
  let {ct = cancellable, scope = {}} = ctx;
  while (true) {
    if (ct.isCancelled) return;
    await $do({...ctx, ct, scope}, params);
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
  let {ct = cancellable, scope = {}} = ctx;
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await $do({...ctx, ct, scope}, [...commands]);
  }
}
repeat.meta = {
  name: 'repeat',
  params: [
    { name: 'times', validate: isNumber },
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
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const commands = {
  cancel,
  pause,
  timeout,
  'do': $do,
  loop,
  repeat
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////
