/**
 * A Cancellation Token (ct) that traffic light commands can check for
 * cancellation. Keeps a list of timeout IDs issued by setTimeout calls
 * and cancels them all when cancel() is called, setting the isCancelled
 * attribute to true.
 * Commands should regularly check for their Cancellation Token isCancelled
 * attribute and exit eagerly if true.
 */
class Cancellable {

  /**
   * Creates a Cancellable instance, also called a Cancellation Token by
   * traffic light commands that only care for the isCancelled attribute.
   */
  constructor() {
    /** If the Cancellable is cancelled. Starts off as false. */
    this.isCancelled = false;
    /**
     * Object storing timeout IDs and corresponding Promise resolve functions.
     */
    this._timeoutIDs = {};
  }

  /**
   * Registers the given timeout ID and Promise resolve function.
   * @param timeoutID - Timeout ID, the result of calling
   *   setTimeout, platform dependent.
   * @param {function} resolve - Resolve function for a Promise that should
   *   be called if the timeout is cancelled.
   */
  add(timeoutID, resolve) {
    this._timeoutIDs[timeoutID.id||timeoutID] = [timeoutID, resolve];
  }

  /**
   * Unregisters the given timeout ID, meaning that the timeout was reached and
   * will not be cancelled anymore.
   * @param timeoutID - Timeout ID to unregister.
   */
  del(timeoutID) {
    delete this._timeoutIDs[timeoutID.id||timeoutID];
  }

  /**
   * Cancels all register timeouts. Sets isCancelled to true.
   * Cancellation means calling clearTimeout with the stored timeout IDs and
   * calling the corresponding resolve functions.
   */
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
