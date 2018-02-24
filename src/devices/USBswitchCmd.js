/**
 * @file Defines a Device connected to a physical Cleware Traffic Light
 *   through the USBswitchCmd.exe executable.
 *   Product page: http://www.cleware.info/data/usbtischampel_E.html
 *   USBswitchCmd.exe documentation:
 *     http://www.cleware.info/data/cleware_control_E.html#USBswitchCMD
 *   Download URL:
 *     http://www.cleware.info/downloads/english/USBswitchCmd_E%205.0.0.zip
 *   USBswitchCMD.exe is a Windows executable.
 *   Used version: version 5.0.0
 *
 *   Output from `USBswitchCmd.exe -h`:
 *   ```
 *   Usage: USBswitchCmd.exe [-n device] [0 | 1] [-...]
 *          -n device   use device with this serial number or registry base
 *          0 | 1       turns switch off(0) or on(1)
 *      r | y | g | o   turns red, yellow, green on or all off
 *          -r          read the current setting
 *          -R          return the current setting
 *          -# switch#  select switch for multiple switch device, first=0, multiple comma seperated
 *          -b                        binary mode, set or read all channels together, channel binary coded (1,2,4,8,16,....)
 *          -i nnn      interval test, turn endless on/off and wait nnn ms between state change
 *          -I nnn      interval test, turn once on/off and wait nnn ms between state change
 *          -p t1 .. tn pulse, turn the switch 0.5 sec. on, then off wait t1 sec., turn on,off wait t2 sec.etc
 *          -s          secure switching - wait and ask if switching was done
 *          -v          print version
 *          -h          print command usage
 *          -l          list devices
 *          -t          reseT the device
 *          -d          print debug infos
 *   ```
 */

let {PhysicalTrafficLight} = require('../physical-traffic-light');
let Device = require('../device');
let proc = require('child_process');

///////////////

module.exports = function(options) {

  var module = {};

  ////////////////

  // constants for the USBswitchCmd executable
  const USB_TRAFFIC_LIGHT_DEVICE_TYPE=0x08;
  const RED=0, YELLOW=1, GREEN=2;
  const ON=1, OFF=0;

  ////////////////

  function execUSBswitchCmd(params) {
    let call = `${options.path} ${params}`;
    return new Promise((resolve, reject) => {
      proc.exec(call, (error, stdout, stderr) => {
        // USBswitchCmd exits with code != 0 (error) even when it succeeds,
        // that's why 'error' is not checked
        if (stdout.match(/USBswitch not found/)) {
          // "USBswitch not found" is the only identified error situation
          reject(stdout);
        }
        else {
          resolve(stdout);
        }
    	});
    });
  }

  ////////////////

  class USBswitchCmdDeviceRegister {

    constructor() {
      // devices keyed by their serial numbers
      this._devices = {};
    }

    async refreshDevices() {
      let deviceListOutput = await execUSBswitchCmd('-l');
      // returns lines like:
      //   Device 0: Type=8, Version=29, SerNum=900636
      // Traffic Lights are devices with Type=${USB_TRAFFIC_LIGHT_DEVICE_TYPE}
      // Serial Numbers are unique per device
      let rx = /Device\D+(\d+)\W+Type\D+(\d+)\W+Version\D+\d+\W+SerNum\D+(\d+)/gi;
      let ds = this._devices, serialNums = [], m;
      while (m = rx.exec(deviceListOutput)) {
        let [, deviceNum, type, serialNum] = m;
        if (type != USB_TRAFFIC_LIGHT_DEVICE_TYPE) continue;
        ds[serialNum] = ds[serialNum] ||
          new USBswitchCmdDevice(deviceNum, serialNum);
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
  module.USBswitchCmdDeviceRegister = USBswitchCmdDeviceRegister;

  ////////////////

  let DeviceRegister = new USBswitchCmdDeviceRegister();

  ////////////////

  class USBswitchCmdDevice extends Device {

    static async refreshDevices() {
      return DeviceRegister.refreshDevices();
    }

    constructor(deviceNum, serialNum) {
      super();
      this.deviceNum = deviceNum;
      this.serialNum = serialNum;
    }

    async turn(lightNum, on) {
      if (!this.isConnected) return;
      try {
        await execUSBswitchCmd(`-n ${this.deviceNum} -# ${lightNum} ${on}`);
      } catch(e) {
        // if the executable failed, assume the device was disconnected
        this.disconnect();
      }
    }

  }
  module.USBswitchCmdDevice = USBswitchCmdDevice;

  ///////////////

  async function resolveConnectedTrafficLight() {
    let devicesBySerialNum = await USBswitchCmdDevice.refreshDevices();
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
