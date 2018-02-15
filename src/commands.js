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

let cancel = (ct=cancellable) => {
  ct.cancel();
  cancellable = new Cancellable;
};

let pause = (ms, ct=cancellable) => {
  if (ct.isCancelled) return;
  return new Promise(resolve => {
    let timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms)
    ct.add(timeoutID, resolve);
  });
};

let flash = async (light, ms=500, ct=cancellable) => {
  light.toggle();
  await pause(ms, ct);
  light.toggle();
  if (ct.isCancelled) return;
  await pause(ms, ct);
};

module.exports = {
  Cancellable, cancel, pause, flash
}
