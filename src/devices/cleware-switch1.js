let {Device, DeviceManager} = require('../device');
let HID = require('node-hid');

//////////////////////////////////////////////
// Some info taken from:
//   https://github.com/flok99/clewarecontrol
//////////////////////////////////////////////

const VENDOR_ID = 0xd50; // Cleware
const SWITCH1_DEVICE = 0x8; // traffic light

//////////////////////////////////////////////

class ClewareSwitch1Device extends Device {

  constructor(deviceInfo) {
    super(null, false);
  }

  connectWith(deviceInfo) {
    this.serialNum = parseInt(deviceInfo.serialNumber, 16);
    this.hid = new HID.HID(deviceInfo.path);
    this.connect();
  }

  turn(lightID, onOff) {
    if (!this.isConnected) return;
    try {
      this.hid.write([0, 0, 0x10 + lightID, onOff]);
    } catch (e) {
      this.disconnect();
    }
  }

}

//////////////////////////////////////////////

let usbDetect = require('usb-detection');

//////////////////////////////////////////////

class ClewareSwitch1DeviceManager extends DeviceManager {

  startMonitoring() {
    usbDetect.startMonitoring();
  }

  stopMonitoring() {
    usbDetect.stopMonitoring();
  }

  constructor() {
    super('cleware-switch1');
    this._devicesBySerialNum = {}; // devices keyed by their serial numbers

    this.refreshDevices();
    usbDetect.on(`add:${VENDOR_ID}:${SWITCH1_DEVICE}`, () => {
      this.refreshDevices();
      this.emit('added');
    });
    usbDetect.on(`remove:${VENDOR_ID}:${SWITCH1_DEVICE}`, () => {
      this.refreshDevices();
      this.emit('removed');
    });
  }

  reset() {
    // clear the devices
    this._devicesBySerialNum = {};
  }

  refreshDevices() {
    let deviceInfos = HID.devices(VENDOR_ID, SWITCH1_DEVICE)
      .filter(d => d.serialNumber); // has a serial number
    let ds = this._devicesBySerialNum, serialNums = [];
    for (let i = 0; i < deviceInfos.length; ++i) {
      let deviceInfo = deviceInfos[i];
      let serialNum = deviceInfo.serialNumber;
      ds[serialNum] = ds[serialNum] || new ClewareSwitch1Device();
      ds[serialNum].connectWith(deviceInfo);
      serialNums.push(serialNum);
    }
    this._disconnectDevicesNotIn(serialNums);
    return ds;
  }

  _disconnectDevicesNotIn(serialNums) {
    Object.keys(this._devicesBySerialNum) // all serial numbers
      .filter(sn => serialNums.indexOf(sn) < 0) // array diff (not in)
      .map(sn => this._devicesBySerialNum[sn]) // get devices
      .forEach(device => device.disconnect()); // disconnect them
  }

  allDevices() {
    return Object.values(this._devicesBySerialNum);
  }

}

////////////////

let Manager = new ClewareSwitch1DeviceManager();

////////////////

module.exports = {
  ClewareSwitch1DeviceManager,
  ClewareSwitch1Device,
  Manager
};
