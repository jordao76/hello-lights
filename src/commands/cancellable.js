/**
 * A Cancellation Token (ct) that commands can check for cancellation.
 * Commands should regularly check for the
 * {@link commands.Cancellable#isCancelled|isCancelled}
 * attribute and exit eagerly if true.
 * Keeps a list of timeout IDs issued by
 * {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout|setTimeout}
 * calls and cancels them all when {@link commands.Cancellable#cancel|cancel} is called,
 * setting the {@link commands.Cancellable#isCancelled|isCancelled} attribute to true.
 * @memberof commands
 */
class Cancellable {

  /** Cancellable constructor. */
  constructor() {
    /** If the Cancellation Token is cancelled. Starts off as false. */
    this.isCancelled = false;
    // Object storing timeout IDs and related Promise resolve functions.
    this._timeoutIDs = {};
  }

  /**
   * Registers the given timeout ID and
   * {@link https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises|Promise}
   * resolve function.
   * @package
   * @param timeoutID - Timeout ID, the result of calling
   *   {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout|setTimeout},
   *   platform dependent.
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
   * Cancels all registered timeouts. Sets {@link commands.Cancellable#isCancelled|isCancelled} to true.
   * Cancellation means calling {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout|clearTimeout}
   * with the stored timeout IDs and calling the related resolve functions.
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
