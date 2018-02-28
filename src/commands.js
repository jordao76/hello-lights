/**
 * @file Defines commands to control a {@link TrafficLight}.
 *   The commands are usually time-based and are cancellable
 *   by a Cancellation Token. All commands take an optional
 *   Cancellation Token (ct) parameter and use a default if one
 *   is not provided. Cancellation Tokens are instances of {@link Cancellable}.
 */

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
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 */
function cancel(ct = cancellable) {
  if (ct.isCancelled) return;
  ct.cancel();
  if (ct === cancellable) {
    cancellable = new Cancellable;
  }
}

//////////////////////////////////////////////////////////////////////////////

/**
 * Pauses execution for the given duration.
 * @param {number} ms - Duration in milliseconds for the pause.
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 * @returns {Promise} Promise that resolves when the pause duration is complete,
 *   or if it's cancelled. Note that even if the pause is cancelled, the Promise
 *   is resolved, never rejected.
 */
function pause(ms, ct = cancellable) {
  if (ct.isCancelled) return;
  return new Promise(resolve => {
    let timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms)
    ct.add(timeoutID, resolve);
  });
}
/** Pause documentation. */
pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration.',
  usage: 'pause [duration in ms]',
  eg: 'pause 500'
};

//////////////////////////////////////////////////////////////////////////////

/**
 * Executes a command with the given arguments.
 * Catches any errors and returns them instead of throwing them.
 * @deprecated
 * @param {function} command - Command function.
 * @param {...*} args - All arguments of the command.
 * @returns {(Promise|Error)} The result of the command execution
 *   (usually a Promise) or an Error if one was thrown.
 */
function run(command, ...args) {
  try {
    return command(...args);
  } catch(e) {
    return e;
  }
}

//////////////////////////////////////////////////////////////////////////////

/**
 * Executes a cancellable-command (cc) with a timeout.
 * @param {function} cc - Cancellable-command, a command function
 *   that takes a Cancellation Token parameter.
 * @param {number} ms - Duration in milliseconds for the timeout.
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 * @returns {Promise} The result of the command execution (can be an Error) if
 *   the command finished before the timeout.
 */
async function timeout(cc, ms, ct = cancellable) {
  let timeoutC = new Cancellable;
  let timeoutP = pause(ms, ct);
  // race the cancellable-command against the timeout
  let res = await Promise.race([run(cc, timeoutC), timeoutP]);
  // check if the timeout was reached
  // 42 is arbitrary, but it CAN'T be the value returned by timeoutP
  let value = await Promise.race([timeoutP, 42]);
  if (value !== 42 || ct.isCancelled) {
    // the timeout was reached (value !== 42) OR the timeout was cancelled
    timeoutC.cancel();
  }
  return res;
}

/** Timeout documentation. */
timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout.',
  usage: 'timeout [duration in ms] ([command to execute])',
  eg: 'timeout 5000 (twinkle red 400)'
};

//////////////////////////////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////////////////////////////

let isOn = state =>
  (state === 'off' || state === 'false') ? false : !!state;

let turnLight = (oLight, state) => oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////

function toggle(tl, light, ct = cancellable) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light',
  usage: 'toggle [red|yellow|green]',
  eg: 'toggle green'
};

//////////////////////////////////////////////////////////////////////////////

function turn(tl, light, on, ct = cancellable) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off',
  usage: 'turn [red|yellow|green] [on|off]',
  eg: 'turn green on'
};

//////////////////////////////////////////////////////////////////////////////

function reset(tl, ct = cancellable) {
  if (ct.isCancelled) return;
  tl.reset();
}
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off',
  usage: 'reset',
  eg: 'reset'
};

//////////////////////////////////////////////////////////////////////////////

function lights(tl, r, y, g, ct = cancellable) {
  if (ct.isCancelled) return;
  turnLight(tl.red, r);
  turnLight(tl.yellow, y);
  turnLight(tl.green, g);
}
lights.doc = {
  name: 'lights',
  desc: 'Set the lights to the given values (on=1 or off=0)',
  usage: 'lights [red on/off] [yellow on/off] [green on/off]',
  eg: 'lights off off on'
};

//////////////////////////////////////////////////////////////////////////////

async function flash(tl, light, ms=500, ct = cancellable) {
  if (ct.isCancelled) return;
  tl[light].toggle();
  await pause(ms, ct);
  tl[light].toggle();
  await pause(ms, ct);
}
flash.doc = {
  name: 'flash',
  desc: 'Flashes a light for the given duration: toggle, wait, toggle back, wait again',
  usage: 'flash [light] [duration in ms]',
  eg: 'flash red 500'
};

//////////////////////////////////////////////////////////////////////////////

async function blink(tl, light, ms=500, times=10, ct = cancellable) {
  while (times-- > 0) {
    if (ct.isCancelled) break;
    await flash(tl, light, ms, ct);
  }
}
blink.doc = {
  name: 'blink',
  desc: 'Flashes a light for the given duration and number of times',
  usage: 'blink [light] [duration in ms] [number of times to flash]',
  eg: 'blink yellow 500 10'
};

//////////////////////////////////////////////////////////////////////////////

async function twinkle(tl, light, ms=500, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await flash(tl, light, ms, ct);
  }
}
twinkle.doc = {
  name: 'twinkle',
  desc: 'Flashes a light for the given duration forever',
  usage: 'twinkle [light] [duration in ms]',
  eg: 'twinkle green 500'
};

//////////////////////////////////////////////////////////////////////////////

async function cycle(tl, ms=500, flashes=2, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl,'red',ms,flashes,ct);
    await blink(tl,'yellow',ms,flashes,ct);
    await blink(tl,'green',ms,flashes,ct);
  }
}
cycle.doc = {
  name: 'cycle',
  desc: 'Blinks each light in turn for the given duration and number of times, repeating forever; starts with red',
  usage: 'cycle [duration in ms] [number of times to flash each light]',
  eg: 'cycle 500 2'
};

//////////////////////////////////////////////////////////////////////////////

async function jointly(tl, ms=500, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await Promise.all([
      flash(tl,'red', ms, ct),
      flash(tl,'yellow', ms, ct),
      flash(tl,'green', ms, ct)
    ]);
  }
}
jointly.doc = {
  name: 'jointly',
  desc: 'Flashes all lights together forever',
  usage: 'jointly [duration in ms of each flash]',
  eg: 'jointly 500'
};

//////////////////////////////////////////////////////////////////////////////

async function heartbeat(tl, light, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl,light,250,2,ct);
    await pause(350,ct);
  }
}
heartbeat.doc = {
  name: 'heartbeat',
  desc: 'Heartbeat pattern',
  usage: 'heartbeat [light]',
  eg: 'heartbeat red'
};

//////////////////////////////////////////////////////////////////////////////

async function sos(tl, light, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl,light,150,3,ct);
    await blink(tl,light,250,2,ct);
    tl[light].toggle();
    await pause(250,ct);
    tl[light].toggle();
    await pause(150,ct);
    await blink(tl,light,150,3,ct);
    await pause(700,ct);
  }
}
sos.doc = {
  name: 'sos',
  desc: 'SOS distress signal morse code pattern',
  usage: 'sos [light]',
  eg: 'sos red'
};

//////////////////////////////////////////////////////////////////////////////

async function danger(tl, ct = cancellable) {
  await twinkle(tl, 'red', 400, ct);
}
danger.doc = {
  name: 'danger',
  desc: 'Danger: twinkle red with 400ms flashes',
  usage: 'danger',
  eg: 'danger'
};

//////////////////////////////////////////////////////////////////////////////

async function bounce(tl, ms=500, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    tl.green.toggle(); await pause(ms,ct); tl.green.toggle();
    tl.yellow.toggle(); await pause(ms,ct); tl.yellow.toggle();
    tl.red.toggle(); await pause(ms,ct); tl.red.toggle();
    tl.yellow.toggle(); await pause(ms,ct); tl.yellow.toggle();
  }
}
bounce.doc = {
  name: 'bounce',
  desc: 'Bounces through the lights with the given duration between them',
  usage: 'bounce [duration in ms between lights]',
  eg: 'bounce 500'
};

//////////////////////////////////////////////////////////////////////////////

async function soundbar(tl, ms=500, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    tl.green.toggle(); await pause(ms,ct);
    tl.yellow.toggle(); await pause(ms,ct);
    tl.red.toggle(); await pause(ms,ct);
    tl.red.toggle(); await pause(ms,ct);
    tl.yellow.toggle(); await pause(ms,ct);
    tl.green.toggle(); await pause(ms,ct);
  }
}
soundbar.doc = {
  name: 'soundbar',
  desc: 'Soundbar: just like a sound bar with the given duration',
  usage: 'soundbar [duration in ms for the lights]',
  eg: 'soundbar 500'
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel, pause, run, timeout,
  toggle, turn, reset, lights,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar,
  published: {
    toggle, turn, reset, lights,
    flash, blink, twinkle,
    cycle, jointly, heartbeat,
    sos, danger, bounce, soundbar
  }
};
