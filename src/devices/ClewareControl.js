/**
 * @file Defines a Device connected to a physical Cleware Traffic Light
 *   through the clewarecontrol Linux executable.
 *   Product page: http://www.cleware.info/data/usbtischampel_E.html
 *   clewarecontrol page:
 *     https://www.vanheusden.com/clewarecontrol/
 *   Download URL:
 *     https://www.vanheusden.com/clewarecontrol/files/clewarecontrol-4.4.tgz
 *   Procedure:
 *     $ sudo apt-get install build-essential libhidapi-dev
 *     $ wget https://www.vanheusden.com/clewarecontrol/files/clewarecontrol-4.4.tgz
 *     $ tar xvfz clewarecontrol-4.4.tgz
 *     $ cd clewarecontrol-4.4
 *     $ sudo make install
 *     $ sudo chmod go+rw /dev/usb/*
 *   clewarecontrol is a Linux executable, to test it:
 *     $ clewarecontrol -l
 *   Using version 4.4
 */

let {PhysicalTrafficLight} = require('../physical-traffic-light');
let {Device} = require('../device');
let proc = require('child_process');

///////////////

module.exports = function(options) {

  var module = {};

  ////////////////

  // enrich options

  options.path = options.path || 'clewarecontrol';

  options.rxStdOutError = /Device \d+ not found/;

  // matches output like:
  //   Cleware library version: 330
  //   Number of Cleware devices found: 1
  //   Device 0: Type=Switch (8), Version=29, Serial Number=900636
  options.rxDeviceList =
    // Captures:
    //   1. Device number
    //   2. Type code
    //   3. Serial number
    /Device\D+(\d+)\W+Type[^(]+\((\d+)\)\W+Version\D+\d+\W+Serial Number\D+(\d+)/gi;

  options.argsListDevices = '-l';

  options.argsTurnLight = (device, lightNum, on) =>
    `-d ${device.serialNum} -c 1 -as ${lightNum} ${on}`;

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
