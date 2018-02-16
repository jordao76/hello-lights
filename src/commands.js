class Cancellable {
  constructor() {
    this.isCancelled = false;
    this._timeoutIDs = {};
  }
  add(timeoutID, resolve) {
    this._timeoutIDs[timeoutID.id||timeoutID] = [timeoutID, resolve];
  }
  del(timeoutID) {
    delete this._timeoutIDs[timeoutID.id||timeoutID];
  }
  cancel() {
    this.isCancelled = true;
    for (let [_, [timeoutID, resolve]] of Object.entries(this._timeoutIDs)) {
      this.del(timeoutID);
      clearTimeout(timeoutID);
      resolve();
    }
  }
}

let cancellable = new Cancellable;

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

async function flash(light, ms=500, ct=cancellable) {
  light.toggle();
  await pause(ms, ct);
  light.toggle();
  if (ct.isCancelled) return;
  await pause(ms, ct);
}

async function blink(light, ms=500, times=10, ct=cancellable) {
  while (times-- > 0) {
    if (ct.isCancelled) break;
    await flash(light, ms, ct);
  }
}

async function twinkle(light, ms=500, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await flash(light, ms, ct);
  }
}

async function cycle(tl, ms=500, flashes=2, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(tl.red,ms,flashes,ct);
    await blink(tl.yellow,ms,flashes,ct);
    await blink(tl.green,ms,flashes,ct);
  }
}

async function jointly(tl, ms=500, ct=cancellable) {
  await Promise.all([
    twinkle(tl.red,ms,ct),
    twinkle(tl.yellow,ms,ct),
    twinkle(tl.green,ms,ct)
  ]);
}

async function heartbeat(light, beatMs=250, pauseMs=350, ct=cancellable) {
  while (true) {
    if (ct.isCancelled) break;
    await blink(light,beatMs,2,ct);
    await pause(pauseMs,ct);
  }
}

var module;
(module || {}).exports = {
  Cancellable,
  cancel, pause,
  flash, blink, twinkle,
  cycle, jointly, heartbeat
}
