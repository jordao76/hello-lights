/**
 * A Cancellation Token (ct) that commands can check for cancellation.
 * Commands should regularly check for the {@link Cancellable#isCancelled}
 * attribute and exit eagerly if true.
 * Keeps a list of timeout IDs issued by {@link setTimeout} calls and cancels
 * them all when {@link Cancellable#cancel} is called, setting the
 * {@link Cancellable#isCancelled} attribute to true.
 * @memberof commands
 */
class Cancellable {

  /** Cancellable constructor. */
  constructor() {
    /** If the Cancellation Token is cancelled. Starts of as false. */
    this.isCancelled = false;
    // Object storing timeout IDs and related Promise resolve functions.
    this._timeoutIDs = {};
  }

  /**
   * Registers the given timeout ID and {@link Promise} resolve function.
   * @package
   * @param timeoutID - Timeout ID, the result of calling
   *   {@link setTimeout}, platform dependent.
   * @param {function} resolve - Resolve function for a {@link Promise} to be
   *   called if the timeout is cancelled.
   */
  add(timeoutID, resolve) {
    this._timeoutIDs[timeoutID.id||timeoutID] = [timeoutID, resolve];
  }

  /**
   * Unregisters the given timeout ID, when the timeout is reached and
   * does not need to be cancelled anymore, or if it was cancelled.
   * @package
   * @param timeoutID - Timeout ID to unregister.
   */
  del(timeoutID) {
    delete this._timeoutIDs[timeoutID.id||timeoutID];
  }

  /**
   * Cancels all registered timeouts. Sets {@link Cancellable#isCancelled} to true.
   * Cancellation means calling {@link clearTimeout} with the stored timeout IDs and
   * calling the related resolve functions.
   */
  cancel() {
    this.isCancelled = true;
    for (let [, [timeoutID, resolve]] of Object.entries(this._timeoutIDs)) {
      this.del(timeoutID);
      clearTimeout(timeoutID);
      resolve();
    }
  }

}

module.exports = {Cancellable};
