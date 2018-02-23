/**
 * A Cancellation Token (ct) that cancellable commands can check for
 * cancellation.
 * Commands should regularly check for their Cancellation Token isCancelled
 * attribute and exit eagerly if true.
 */
class CancellationToken {

  /** Creates a Cancellation Token instance. */
  constructor(isCancelled=false) {
    /** If the Cancellation Token is cancelled. False by default. */
    this.isCancelled = isCancelled;
  }

}

/**
 * A Cancellation Token (ct) that keeps a list of timeout IDs issued by
 * setTimeout calls and cancels them all when cancel() is called, setting
 * the isCancelled attribute to true.
 */
class Cancellable extends CancellationToken {

  /** Creates a Cancellable instance. */
  constructor() {
    super(false);
    /**
     * Object storing timeout IDs and corresponding Promise resolve functions.
     * @private
     */
    this._timeoutIDs = {};
  }

  /**
   * Registers the given timeout ID and Promise resolve function.
   * @package
   * @param timeoutID - Timeout ID, the result of calling
   *   setTimeout, platform dependent.
   * @param {function} resolve - Resolve function for a Promise to be called
   *   if the timeout is cancelled.
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
   * Cancels all registered timeouts. Sets isCancelled to true.
   * Cancellation means calling clearTimeout with the stored timeout IDs and
   * calling the corresponding resolve functions.
   * @package
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
