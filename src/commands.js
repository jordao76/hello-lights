let Cancellable = require('./cancellable');

let cancellable = new Cancellable; // default cancellable
async function cancel(ct=cancellable) {
  ct.cancel();
  if (ct === cancellable) {
    cancellable = new Cancellable;
  }
}

async function pause(ms, ct=cancellable) {
  if (ct.isCancelled) return;
  return new Promise(resolve => {
    let timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms)
    ct.add(timeoutID, resolve);
  });
}

// cancellable command (cc) -> a command that runs with a (deferred) cancellation token
// all arguments of the command but the last (the cancellation token) must be provided
let makecc = (command, ...args) =>
  (ct) => command(...args, ct);

function run(command, ...args) {
  try {
    return command(...args);
  } catch(e) {
    return e;
  }
}

async function timeout(cc, ms, ct=cancellable) {
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

async function flash(light, ms=500, ct=cancellable) {
  light.toggle();
  await pause(ms, ct);
  light.toggle();
  await pause(ms, ct);
}
flash.name = 'flash';
flash.desc = 'Flashes a light for the given duration: toggle, wait, toggle back, wait again';
flash.usage = 'flash [light] [duration in ms]';
flash.eg = 'flash red 500';

async function blink(light, ms=500, times=10, ct=cancellable) {
  while (times-- > 0) {
    if (ct.isCancelled) break;
    await flash(light, ms, ct);
  }
}
blink.name = 'blink';
blink.desc = 'Flashes a light for the given duration and number of times';
blink.usage = 'blink [light] [duration in ms] [number of times to flash]';
blink.eg = 'blink yellow 500 10';

async function twinkle(light, ms=500, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await flash(light, ms, ct);
  }
}
twinkle.name = 'twinkle';
twinkle.desc = 'Flashes a light for the given duration forever';
twinkle.usage = 'twinkle [duration in ms]';
twinkle.eg = 'twinkle green 500';

async function cycle(tl, ms=500, flashes=2, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl.red,ms,flashes,ct);
    await blink(tl.yellow,ms,flashes,ct);
    await blink(tl.green,ms,flashes,ct);
  }
}
cycle.name = 'cycle';
cycle.desc = 'Blinks each light in turn for the given duration and number of times, repeating forever; starts with Red';
cycle.usage = 'cycle [duration in ms] [number of times to flash each light]';
cycle.eg = 'cycle 500 2';

async function jointly(tl, ms=500, ct=cancellable) {
  await Promise.all([
    twinkle(tl.red,ms,ct),
    twinkle(tl.yellow,ms,ct),
    twinkle(tl.green,ms,ct)
  ]);
}
jointly.name = 'jointly';
jointly.desc = 'Flashes all lights together forever';
jointly.usage = 'jointly [duration in ms of each flash]';
jointly.eg = 'jointly 500';

async function heartbeat(light, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(light,250,2,ct);
    await pause(350,ct);
  }
}
heartbeat.name = 'heartbeat';
heartbeat.desc = 'Heartbeat pattern';
heartbeat.usage = 'heartbeat [light]';
heartbeat.eg = 'heartbeat red';

module.exports = {
  cancellable,
  cancel, pause, run, timeout, makecc,
  flash, blink, twinkle,
  cycle, jointly, heartbeat,
  published: {
    flash, blink, twinkle,
    cycle, jointly, heartbeat
  }
}
