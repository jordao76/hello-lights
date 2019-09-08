//////////////////////////////////////////////

class NullUsbDetector {

  startMonitoring() { }

  stopMonitoring() { }

  on(eventName, callback) { }

  supportsMonitoring() {
    return false;
  }

}

//////////////////////////////////////////////

class UsbDetector {

  constructor(usbDetect) {
    this._usbDetect = usbDetect;
    this._monitoringCount = 0;
  }

  startMonitoring() {
    if (this._monitoringCount === 0) {
      this._usbDetect.startMonitoring();
    }
    ++this._monitoringCount;
  }

  stopMonitoring() {
    if (this._monitoringCount === 0) return;
    --this._monitoringCount;
    if (this._monitoringCount === 0) {
      this._usbDetect.stopMonitoring();
    }
  }

  on(eventName, callback) {
    this._usbDetect.on(eventName, callback);
  }

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
const usbDetector = usbDetect ? new UsbDetector(usbDetect) : new NullUsbDetector(); // singleton

//////////////////////////////////////////////

module.exports = {NullUsbDetector, UsbDetector, usbDetector};
