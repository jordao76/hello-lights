/**
 * @file Defines commands to control a {@link TrafficLight}.
 *   The commands are usually time-based and are cancellable
 *   by a Cancellation Token. All commands take an optional
 *   Cancellation Token (ct) parameter and use a default if one
 *   is not provided. Cancellation Tokens are instances of {@link Cancellable}.
 */

//////////////////////////////////////////////////////////////////////////////
// Utility functions

let isOn = state =>
 (state === 'off' || state === 'false') ? false : !!state;
let turnLight = (oLight, state) =>
 oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////
// Validation functions

let isLight = l => l === 'red' || l === 'yellow' || l === 'green';
let isState = s => s === 'on' || s === 'off';
let isNumber = n => typeof n === 'number';
let isPeriod = isNumber;
let isCommand = f => typeof f === 'function';

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
/** Cancel documentation. */
cancel.doc = {
  name: 'cancel',
  desc: 'Cancels all executing commands.',
  usage: 'cancel',
  eg: 'cancel'
};
cancel.validation = [];

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
async function pauseWithTrafficLight(tl, ms, ct = cancellable) {
  // just ignore the traffic light parameter
  await pause(ms, ct);
}
/** Pause documentation. */
pauseWithTrafficLight.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration.',
  usage: 'pause [duration in ms]',
  eg: 'pause 500'
};
pause.validation = [isPeriod];

//////////////////////////////////////////////////////////////////////////////

/**
 * Executes a cancellable-command (cc) with a timeout.
 * @param {TrafficLight} tl - The traffic light to run the command against.
 * @param {number} ms - Duration in milliseconds for the timeout.
 * @param {function} command - A prepared command function, that takes a
 *   traffic light (tl) and a Cancellation Token (ct) parameters. This is the
 *   kind of command returned from {@link CommandParser#parse}.
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 * @returns {Promise} The result of the command execution (can be an Error) if
 *   the command finished before the timeout.
 */
async function timeout(tl, ms, command, ct = cancellable) {
  let timeoutC = new Cancellable;
  let timeoutP = pause(ms, ct);
  // race the cancellable-command against the timeout
  let res = await Promise.race([command(tl, timeoutC), timeoutP]);
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
timeout.validation = [isPeriod, isCommand];

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
toggle.validation = [isLight];

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
turn.validation = [isLight, isState];

//////////////////////////////////////////////////////////////////////////////

async function reset(tl, ct = cancellable) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off',
  usage: 'reset',
  eg: 'reset'
};
reset.validation = []; // validates number of parameters (zero)

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
lights.validation = [isState, isState, isState];

//////////////////////////////////////////////////////////////////////////////

async function flash(tl, light, ms, ct = cancellable) {
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
flash.validation = [isLight, isPeriod];

//////////////////////////////////////////////////////////////////////////////

async function blink(tl, light, ms, times, ct = cancellable) {
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
blink.validation = [isLight, isPeriod, isNumber];

//////////////////////////////////////////////////////////////////////////////

async function twinkle(tl, light, ms, ct = cancellable) {
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
twinkle.validation = [isLight, isPeriod];

//////////////////////////////////////////////////////////////////////////////

async function cycle(tl, ms, flashes, ct = cancellable) {
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
cycle.validation = [isPeriod, isNumber];

//////////////////////////////////////////////////////////////////////////////

async function jointly(tl, ms, ct = cancellable) {
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
jointly.validation = [isPeriod];

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
heartbeat.validation = [isLight];

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
sos.validation = [isLight];

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
danger.validation = [];

//////////////////////////////////////////////////////////////////////////////

async function bounce(tl, ms, ct = cancellable) {
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
bounce.validation = [isPeriod];

//////////////////////////////////////////////////////////////////////////////

async function soundbar(tl, ms, ct = cancellable) {
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
soundbar.validation = [isPeriod];

//////////////////////////////////////////////////////////////////////////////

let commands = {
  pause: pauseWithTrafficLight, timeout,
  toggle, turn, reset, lights,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel, pause, timeout,
  toggle, turn, reset, lights,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar,
  published: commands
};
