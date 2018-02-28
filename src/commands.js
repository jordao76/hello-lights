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
 * A traffic light command.
 * @abstract
 */
class Command {

  /**
   * Executes the command.
   * @abstract
   * @param {TrafficLight} tl - Traffic light for the command to operate on.
   * @param {Cancellable} [ct] - Optional Cancellation Token, or a default one.
   * @returns {Promise} Promise that resolves when the command is complete or
   *   cancelled. Note that even if the command is cancelled, the Promise
   *   should be resolved, never rejected.
   */
  call(tl, ct) {
    throw new Error('Command#call is abstract');
  }

  /**
   * Encapsulates the call to {@link this.call} in a function.
   *  @returns {function} A function that calls {@link this.call}.
   */
  get func() {
    return (tl, ct) => this.call(tl, ct);
  }

}

//////////////////////////////////////////////////////////////////////////////

/** Pauses execution for the given duration. */
class Pause extends Command {

  /**
   * Pause constructor.
   * @param {number} ms - Duration in milliseconds for the pause.
   */
  constructor(ms) {
    super();
    this.ms = ms;
  }

  /**
   * Executes the pause.
   * @param {TrafficLight} [tl] - Traffic light for the command to operate on.
   *   Ignored for this command.
   * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
   * @returns {Promise} Promise that resolves when the pause duration is complete,
   *   or if it's cancelled. Note that even if the pause is cancelled, the Promise
   *   is resolved, never rejected.
   */
  call(tl, ct = cancellable) {
    if (ct.isCancelled) return;
    return new Promise(resolve => {
      let timeoutID = setTimeout(() => {
        ct.del(timeoutID);
        resolve();
      }, this.ms)
      ct.add(timeoutID, resolve);
    });
  }

}

/** Pause documentation. */
Pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration.',
  usage: 'pause [duration in ms]',
  eg: 'pause 500'
};

/**
 * Pauses execution for the given duration.
 * Functional encapsulation of Pause.
 * @param {number} ms - Duration in milliseconds for the pause.
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 * @returns {Promise} Promise that resolves when the pause duration is complete,
 *   or if it's cancelled. Note that even if the pause is cancelled, the Promise
 *   is resolved, never rejected.
 */
function pause(ms, ct = cancellable) {
  return new Pause(ms).call(null, ct);
}

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

/** Executes a command with a timeout. */
class Timeout extends Command {

  /**
   * Timeout constructor.
   * @param {number} ms - Duration in milliseconds for the timeout.
   * @param {Command} command - Command to execute.
   */
  constructor(ms, command) {
    super();
    this.pause = new Pause(ms).func;
    this.command = command.func;
  }

  /**
   * Executes the command.
   * @param {TrafficLight} tl - Traffic light for the command to operate on.
   * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
   * @returns {Promise} The result of the command execution if the command
   *   finished before the timeout.
   */
  async call(tl, ct = cancellable) {
    let timeoutC = new Cancellable;
    let timeoutP = this.pause(tl, ct);
    // race the command against the timeout
    let res = await Promise.race([
      this.command(tl, timeoutC),
      timeoutP
    ]);
    // check if the timeout was reached
    // 42 is arbitrary, but it CAN'T be the value returned by timeoutP
    let value = await Promise.race([timeoutP, 42]);
    if (value !== 42 || ct.isCancelled) {
      // the timeout was reached (value !== 42) OR the timeout was cancelled
      timeoutC.cancel();
    }
    return res;
  }
}

/** Timeout documentation. */
Timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout.',
  usage: 'timeout [duration in ms] ([command to execute])',
  eg: 'timeout 5000 (twinkle red 400)'
};

/**
 * Executes a cancellable-command (cc) with a timeout.
 * @deprecated Adapt this function!
 * @param {function} cc - Cancellable-command, a command function
 *   that takes a Cancellation Token parameter.
 * @param {number} ms - Duration in milliseconds for the timeout.
 * @param {Cancellable} [ct] - Optional Cancellation Token, or use the default.
 * @returns {Promise} The result of the command execution (can be an Error) if
 *   the command finished before the timeout.
 */
async function timeout(cc, ms, ct = cancellable) {
  let timeoutC = new Cancellable;
  let timeoutP = pause(ms,ct);
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

//////////////////////////////////////////////////////////////////////////////

function lights(tl, r, y, g, ct = cancellable) {
  if (ct.isCancelled) return;
  let turn = (l, v) => l[v ? 'turnOn' : 'turnOff']();
  turn(tl.red, r);
  turn(tl.yellow, y);
  turn(tl.green, g);
}
lights.name = 'lights';
lights.desc = 'Set the lights to the given values (on=1 or off=0)';
lights.usage = 'lights [red on/off] [yellow on/off] [green on/off]';
lights.eg = 'lights 0 0 1';

//////////////////////////////////////////////////////////////////////////////

async function flash(tl, light, ms=500, ct = cancellable) {
  if (ct.isCancelled) return;
  tl[light].toggle();
  await pause(ms, ct);
  tl[light].toggle();
  await pause(ms, ct);
}
flash.name = 'flash';
flash.desc = 'Flashes a light for the given duration: toggle, wait, toggle back, wait again';
flash.usage = 'flash [light] [duration in ms]';
flash.eg = 'flash red 500';

//////////////////////////////////////////////////////////////////////////////

async function blink(tl, light, ms=500, times=10, ct = cancellable) {
  while (times-- > 0) {
    if (ct.isCancelled) break;
    await flash(tl, light, ms, ct);
  }
}
blink.name = 'blink';
blink.desc = 'Flashes a light for the given duration and number of times';
blink.usage = 'blink [light] [duration in ms] [number of times to flash]';
blink.eg = 'blink yellow 500 10';

//////////////////////////////////////////////////////////////////////////////

async function twinkle(tl, light, ms=500, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await flash(tl, light, ms, ct);
  }
}
twinkle.name = 'twinkle';
twinkle.desc = 'Flashes a light for the given duration forever';
twinkle.usage = 'twinkle [light] [duration in ms]';
twinkle.eg = 'twinkle green 500';

//////////////////////////////////////////////////////////////////////////////

async function cycle(tl, ms=500, flashes=2, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl,'red',ms,flashes,ct);
    await blink(tl,'yellow',ms,flashes,ct);
    await blink(tl,'green',ms,flashes,ct);
  }
}
cycle.name = 'cycle';
cycle.desc = 'Blinks each light in turn for the given duration and number of times, repeating forever; starts with Red';
cycle.usage = 'cycle [duration in ms] [number of times to flash each light]';
cycle.eg = 'cycle 500 2';

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
jointly.name = 'jointly';
jointly.desc = 'Flashes all lights together forever';
jointly.usage = 'jointly [duration in ms of each flash]';
jointly.eg = 'jointly 500';

//////////////////////////////////////////////////////////////////////////////

async function heartbeat(tl, light, ct = cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl,light,250,2,ct);
    await pause(350,ct);
  }
}
heartbeat.name = 'heartbeat';
heartbeat.desc = 'Heartbeat pattern';
heartbeat.usage = 'heartbeat [light]';
heartbeat.eg = 'heartbeat red';

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
sos.name = 'sos';
sos.desc = 'SOS distress signal morse code pattern';
sos.usage = 'sos [light]';
sos.eg = 'sos red';

//////////////////////////////////////////////////////////////////////////////

async function danger(tl, ct = cancellable) {
  await twinkle(tl, 'red', 400, ct);
}
danger.name = 'danger';
danger.desc = 'Danger: twinkle red with 400ms flashes';
danger.usage = 'danger';
danger.eg = 'danger';

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
bounce.name = 'bounce';
bounce.desc = 'Bounces through the lights with the given duration between them';
bounce.usage = 'bounce [duration in ms between lights]';
bounce.eg = 'bounce 500';

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
soundbar.name = 'soundbar';
soundbar.desc = 'Soundbar: just like a sound bar with the given duration';
soundbar.usage = 'soundbar [duration in ms for the lights]';
soundbar.eg = 'soundbar 500';

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel, pause, run, timeout,
  lights,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar,
  published: {
    lights,
    flash, blink, twinkle,
    cycle, jointly, heartbeat,
    sos, danger, bounce, soundbar
  }
};
