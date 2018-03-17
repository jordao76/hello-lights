let { Device } = require('../device');
let { PhysicalTrafficLight } = require('../physical-traffic-light');
let HID = require('node-hid');

//////////////////////////////////////////////
// Some info taken from:
//   https://github.com/flok99/clewarecontrol
//////////////////////////////////////////////

const VENDOR_ID = 0xD50; // Cleware
const SWITCH1_DEVICE = 0x8; // traffic light

//////////////////////////////////////////////

class ClewareUSBDeviceRegister {

  constructor() {
    // devices keyed by their serial numbers
    this._devices = {};
  }

  refreshDevices() {
    let deviceInfos = HID.devices(VENDOR_ID, SWITCH1_DEVICE)
      .filter(d => d.serialNumber); // has a serial number
    let ds = this._devices, serialNums = [];
    for (let i = 0; i < deviceInfos.length; ++i) {
      let deviceInfo = deviceInfos[i];
      let serialNum = deviceInfo.serialNumber;
      ds[serialNum] = ds[serialNum] || new ClewareUSBDevice();
      ds[serialNum].info(deviceInfo);
      serialNums.push(serialNum);
    }
    this._disconnectDevicesNotIn(serialNums);
    return ds;
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
