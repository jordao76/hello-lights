let {PhysicalTrafficLight} = require('../physical-traffic-light');
let {Device} = require('../device');
let proc = require('child_process');

///////////////

module.exports = function(options) {

  var module = {};

  ////////////////

  const USB_TRAFFIC_LIGHT_DEVICE_TYPE=0x08;

  ////////////////

  function execCleware(args) {
    let call = `${options.path} ${args}`;
    return new Promise((resolve, reject) => {
      proc.exec(call, (error, stdout, stderr) => {
        if (stdout.match(options.rxStdOutError)) {
          reject(stdout);
        }
        else {
          resolve(stdout);
        }
    	});
    });
  }

  ////////////////

  class ClewareDeviceRegister {

    constructor() {
      // devices keyed by their serial numbers
      this._devices = {};
    }

    async refreshDevices() {
      // Traffic Lights are devices with Type=${USB_TRAFFIC_LIGHT_DEVICE_TYPE}
      // Serial Numbers are unique per device
      let deviceListOutput = await execCleware(options.argsListDevices);
      let ds = this._devices, serialNums = [], m;
      while (m = options.rxDeviceList.exec(deviceListOutput)) {
        let [, deviceNum, type, serialNum] = m;
        if (type != USB_TRAFFIC_LIGHT_DEVICE_TYPE) continue;
        ds[serialNum] = ds[serialNum] ||
          new ClewareDevice(deviceNum, serialNum);
        serialNums.push(serialNum);
      }
      this._connectDevicesIn(serialNums);
      this._disconnectDevicesNotIn(serialNums);
      return ds;
    }

    _connectDevicesIn(serialNums) {
      serialNums
        .map(sn => this._devices[sn]) // get devices
        .forEach(device => device.connect()); // connect them
    }

    _disconnectDevicesNotIn(serialNums) {
      Object.keys(this._devices) // all serial numbers
        .filter(sn => serialNums.indexOf(sn) < 0) // array diff (not in)
        .map(sn => this._devices[sn]) // get devices
        .forEach(device => device.disconnect()); // disconnect them
    }

  }
  module.ClewareDeviceRegister = ClewareDeviceRegister;

  ////////////////

  let DeviceRegister = new ClewareDeviceRegister();

  ////////////////

  class ClewareDevice extends Device {

    static async refreshDevices() {
      return await DeviceRegister.refreshDevices();
    }

    constructor(deviceNum, serialNum) {
      super(serialNum);
      this.deviceNum = deviceNum;
    }

    async turn(lightNum, on) {
      if (!this.isConnected) return;
      try {
        await execCleware(options.argsTurnLight(this, lightNum, on));
      } catch(e) {
        // if the executable failed, assume the device was disconnected
        this.disconnect();
      }
    }

  }
  module.ClewareDevice = ClewareDevice;

  ///////////////

  async function resolveConnectedTrafficLight() {
    let devicesBySerialNum = await ClewareDevice.refreshDevices();
    let tls = Object.values(devicesBySerialNum)
      .filter(device => device.isConnected)
      .map(device => new PhysicalTrafficLight(device));
    if (tls.length === 0) return null;
    return tls[0]; // the first connected traffic light
  }
  module.resolveConnectedTrafficLight = resolveConnectedTrafficLight;

  ///////////////

  return module;
};
