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
let isState = s => s === 'on' || s === 'off';
let isIdentifier = s => /^[a-z_][a-z_0-9]*$/i.test(s);
let isNumber = n => typeof n === 'number';
let isPeriod = isNumber;
let isCommand = f => typeof f === 'function';
let each = vf => a => Array.isArray(a) && a.every(e => vf(e));

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
cancel.validation = []; // validates number of parameters (zero)
cancel.doc = {
  name: 'cancel',
  desc: 'Cancels all executing commands.',
  usage: 'cancel',
  eg: 'cancel'
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
pause.validation = [isPeriod];
pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration.',
  usage: 'pause [duration in ms]',
  eg: 'pause 500'
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
timeout.validation = [isPeriod, isCommand];
timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout.',
  usage: 'timeout [duration in ms] ([command to execute])',
  eg: 'timeout 5000 (twinkle red 400)'
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
run.validation = [each(isCommand)];
run.doc = {
  name: 'run',
  desc: 'Executes the given commands in sequence',
  usage: 'run [(command to execute)...]',
  eg: 'run (toggle yellow) (pause 1000) (toggle yellow)'
};

//////////////////////////////////////////////////////////////////////////////

async function loop({tl, ct = cancellable, scope = {}}, [commands]) {
  while (true) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
loop.transformation = args => [args];
loop.validation = [each(isCommand)];
loop.doc = {
  name: 'loop',
  desc: 'Executes the given commands in sequence, starting over forever',
  usage: 'loop [(command to execute)...]',
  eg: 'loop (toggle green) (pause 400) (toggle red) (pause 400)'
};

//////////////////////////////////////////////////////////////////////////////

async function repeat({tl, ct = cancellable, scope = {}}, [times, commands]) {
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
repeat.transformation = args => [args[0], args.slice(1)];
repeat.validation = [isNumber, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times',
  usage: 'repeat [number of times to repeat] [(command to execute)...]',
  eg: 'repeat 5 (toggle green) (pause 400) (toggle red) (pause 400)'
};

//////////////////////////////////////////////////////////////////////////////

async function all({tl, ct = cancellable, scope = {}}, [commands]) {
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => command({tl, ct, scope})));
}
all.transformation = args => [args];
all.validation = [each(isCommand)];
all.doc = {
  name: 'all',
  desc: 'Executes the given commands in parallel, all at the same time',
  usage: 'all [(command to execute)...]',
  eg: 'all (twinkle green 700) (twinkle yellow 300)'
};

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct = cancellable}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.validation = [isLight];
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light',
  usage: 'toggle [red|yellow|green]',
  eg: 'toggle green'
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct = cancellable}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.validation = [isLight, isState];
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off',
  usage: 'turn [red|yellow|green] [on|off]',
  eg: 'turn green on'
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct = cancellable}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.validation = []; // validates number of parameters (zero)
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off',
  usage: 'reset',
  eg: 'reset'
};

//////////////////////////////////////////////////////////////////////////////

function lights({tl, ct = cancellable}, [r, y, g]) {
  if (ct.isCancelled) return;
  turnLight(tl.red, r);
  turnLight(tl.yellow, y);
  turnLight(tl.green, g);
}
lights.validation = [isState, isState, isState];
lights.doc = {
  name: 'lights',
  desc: 'Set the lights to the given values (on=1 or off=0)',
  usage: 'lights [red on/off] [yellow on/off] [green on/off]',
  eg: 'lights off off on'
};

//////////////////////////////////////////////////////////////////////////////
// Commands that use a Command Parser
//////////////////////////////////////////////////////////////////////////////

function define({cp}, [name, command]) {
  return cp.define(name, command);
}
define.doc = {
  name: 'define',
  desc: 'Defines a new command, variables in the command become parameters to the new command',
  usage: 'define [name] [command to define]',
  eg: 'define burst (twinkle :light 50)'
};
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
  desc: 'Flashes a light for the given duration: toggle, wait, toggle back, wait again',
  usage: 'flash [light] [duration in ms]',
  eg: 'flash red 500'
};
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
  desc: 'Flashes a light for the given duration and number of times',
  usage: 'blink [light] [duration in ms] [number of times to flash]',
  eg: 'blink yellow 500 10'
};
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
  desc: 'Flashes a light for the given duration forever',
  usage: 'twinkle [light] [duration in ms]',
  eg: 'twinkle green 500'
};
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
  desc: 'Blinks each light in turn for the given duration and number of times, repeating forever; starts with red',
  usage: 'cycle [duration in ms] [number of times to flash each light]',
  eg: 'cycle 500 2'
};
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
  desc: 'Flashes all lights together forever',
  usage: 'jointly [duration in ms of each flash]',
  eg: 'jointly 500'
};
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
  desc: 'Heartbeat pattern',
  usage: 'heartbeat [light]',
  eg: 'heartbeat red'
};
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
  desc: 'SOS distress signal morse code pattern',
  usage: 'sos [light]',
  eg: 'sos red'
};
sos.validation = [isLight];
sos.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

async function danger({cp, tl, ct = cancellable}) {
  await twinkle({cp, tl, ct}, ['red', 400]);
}
danger.doc = {
  name: 'danger',
  desc: 'Danger: twinkle red with 400ms flashes',
  usage: 'danger',
  eg: 'danger'
};
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
  desc: 'Bounces through the lights with the given duration between them',
  usage: 'bounce [duration in ms between lights]',
  eg: 'bounce 500'
};
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
  desc: 'Soundbar: just like a sound bar with the given duration',
  usage: 'soundbar [duration in ms for the lights]',
  eg: 'soundbar 500'
};
soundbar.validation = [isPeriod];
soundbar.usesParser = true;

//////////////////////////////////////////////////////////////////////////////

let commands = {
  cancel, pause, timeout,
  run, loop, repeat, all,
  toggle, turn, reset, lights,
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
  define,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  sos, danger, bounce, soundbar,
  published: commands
};
