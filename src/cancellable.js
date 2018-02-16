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

module.exports = Cancellable;
