let { Device } = require('../device');
let { PhysicalTrafficLight } = require('../physical-traffic-light');
let HID = require('node-hid');

//////////////////////////////////////////////
// Some info taken from:
//   https://github.com/flok99/clewarecontrol
//////////////////////////////////////////////

const VENDOR_ID = 3408; // Cleware
const SWITCH1_DEVICE = 8; // traffic light

//////////////////////////////////////////////

class ClewareUSBDeviceRegister {

  constructor() {
    // keyed by their serial numbers
    this._devices = {};
    this._deviceInfos = {};
  }

  refreshDevices() {
    let deviceInfos = HID.devices(VENDOR_ID, SWITCH1_DEVICE)
      .filter(d => d.serialNumber); // has a serial number
    let serialNums = [];
    for (let i = 0; i < deviceInfos.length; ++i) {
      let deviceInfo = deviceInfos[i];
      let serialNum = deviceInfo.serialNumber;
      this._deviceInfos[serialNum] = deviceInfo;
      this._devices[serialNum] = this._devices[serialNum] ||
        new ClewareUSBDevice();
      this._devices[serialNum].info(deviceInfo);
      serialNums.push(serialNum);
    }
    this._disconnectDevicesNotIn(serialNums);
    return this._devices;
  }

  _disconnectDevicesNotIn(serialNums) {
    Object.keys(this._devices) // all serial numbers
      .filter(sn => serialNums.indexOf(sn) < 0) // array diff (not in)
      .map(sn => this._devices[sn]) // get devices
      .forEach(device => device.disconnect()); // disconnect them
  }

}

////////////////

let register = new ClewareUSBDeviceRegister();

class ClewareUSBDevice extends Device {

  static refreshDevices() {
    return register.refreshDevices();
  }

  constructor(deviceInfo) {
    super(null, false);
  }

  info(deviceInfo) {
    this.serialNum = deviceInfo.serialNumber;
    this.hid = new HID.HID(deviceInfo.path);
    this.connect();
  }

  turn(lightID, onOff) {
    if (!this.isConnected) return;
    try {
      this.hid.write([0, 0, 0x10 + lightID, onOff]);
    } catch(e) {
      this.disconnect();
    }
  }

}

//////////////////////////////////////////////

module.exports = function(options={}) {

  module.ClewareUSBDevice = ClewareUSBDevice;

  function resolveConnectedTrafficLight() {
    let devicesBySerialNum = ClewareUSBDevice.refreshDevices();
    let tls = Object.values(devicesBySerialNum)
      .filter(device => device.isConnected)
      .map(device => new PhysicalTrafficLight(device));
    if (tls.length === 0) return null;
    return tls[0]; // the first connected traffic light
  }
  module.resolveConnectedTrafficLight = resolveConnectedTrafficLight;

  return module;
};
