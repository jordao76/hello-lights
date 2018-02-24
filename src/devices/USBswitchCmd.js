/**
 * @file Defines a Device connected to a physical Cleware Traffic Light
 *   through the USBswitchCmd.exe executable.
 *   Product page: http://www.cleware.info/data/usbtischampel_E.html
 *   USBswitchCmd.exe documentation:
 *     http://www.cleware.info/data/cleware_control_E.html#USBswitchCMD
 *   Download URL:
 *     http://www.cleware.info/downloads/english/USBswitchCmd_E%205.0.0.zip
 *   USBswitchCMD.exe is a Windows executable.
 *   Using version 5.0.0
 */

module.exports = function(options) {

  var module = {};

  ////////////////

  // enrich options

  options.rxStdOutError = /USBswitch not found/;

  // matches output like:
  //   Device 0: Type=8, Version=29, SerNum=900636
  options.rxDeviceList =
    // Captures:
    //   1. Device number
    //   2. Type code
    //   3. Serial number
    /Device\D+(\d+)\W+Type\D+(\d+)\W+Version\D+\d+\W+SerNum\D+(\d+)/gi;

  options.argsListDevices = '-l';

  options.argsTurnLight = (device, lightNum, on) =>
    `-n ${device.deviceNum} -# ${lightNum} ${on}`;

  ////////////////

  let {
    ClewareDeviceRegister,
    ClewareDevice,
    resolveConnectedTrafficLight
  } = require('./Cleware')(options);

  ///////////////

  module.ClewareDeviceRegister = ClewareDeviceRegister;
  module.ClewareDevice = ClewareDevice;
  module.resolveConnectedTrafficLight = resolveConnectedTrafficLight;

  ///////////////

  return module;
};
