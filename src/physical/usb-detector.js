//////////////////////////////////////////////

/**
 * A dummy USB detector that does not support USB monitoring.
 * To use in case the "usb-detection" module is not available.
 * @memberof physical
 */
class NullUsbDetector {

  /** No-op */
  startMonitoring() { }

  /** No-op */
  stopMonitoring() { }

  /** No-op */
  on(eventName, callback) { }

  /**
   * Whether this detector supports monitoring: if the detector detects.
   * @returns If the detector supports monitoring - always `false`.
   */
  supportsMonitoring() {
    return false;
  }

}

//////////////////////////////////////////////

/**
 * A wrapper for the "usb-detection" module.
 * It balances the number of calls to `stopMonitoring` to the previous number
 * of calls to `startMonitoring`.
 * See {@link https://github.com/MadLittleMods/node-usb-detection/|usb-detection}.
 * @memberof physical
 */
class UsbDetector {

  /**
   * @param usbDetect - The "usb-detection" module.
   */
  constructor(usbDetect) {
    this._usbDetect = usbDetect;
    this._monitoringCount = 0;
  }

  /**
   * Starts listening to USB events. Can be called multiple times.
   * Will prevent the process from exiting until `stopMonitoring` is called
   * a matching number of times.
   */
  startMonitoring() {
    if (this._monitoringCount === 0) {
      this._usbDetect.startMonitoring();
    }
    ++this._monitoringCount;
  }

  /**
   * Stops listening to USB events, and allows the process to exit,
   * but ONLY at the last call of a matching chain of `startMonitoring` calls.
   */
  stopMonitoring() {
    if (this._monitoringCount === 0) return;
    --this._monitoringCount;
    if (this._monitoringCount === 0) {
      this._usbDetect.stopMonitoring();
    }
  }

  /**
   * Register a callback to an USB event.
   * See {@link https://github.com/MadLittleMods/node-usb-detection/#usbdetectoneventname-callback|usbDetect#on}.
   * @param {string} eventName - Event name.
   * @param {function} callback - Event callback.
   */
  on(eventName, callback) {
    this._usbDetect.on(eventName, callback);
  }

  /**
   * Whether this detector supports monitoring: if the detector detects.
   * @returns {boolean} If the detector supports monitoring - always `true`.
   */
  supportsMonitoring() {
    return true;
  }

}

//////////////////////////////////////////////

const tryRequire = path => {
  try {
    return require(path);
  } catch (e) {
    return null;
  }
};
// 'usb-detection' is an optional dependency, so it might not be available
const usbDetect = tryRequire('usb-detection');

/**
 * USB detector singleton. Either based on the "usb-detection" module
 * (see {@link https://github.com/MadLittleMods/node-usb-detection/|usb-detection}),
 * or a dummy object that does not support monitoring in case the "usb-detection"
 * module is not available (it's an optional dependency).
 * @memberof physical
 * @type {(UsbDetector|NullUsbDetector)}
 */
const usbDetector = usbDetect ? new UsbDetector(usbDetect) : new NullUsbDetector(); // singleton

//////////////////////////////////////////////

module.exports = {NullUsbDetector, UsbDetector, usbDetector};
