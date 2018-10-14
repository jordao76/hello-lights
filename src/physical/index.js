/**
 * Physical traffic light and devices.
 * @namespace physical
 */

const {
  Device,
  DeviceManager
} = require('./device');
const {
  RED, YELLOW, GREEN,
  ON, OFF,
  PhysicalLight, PhysicalTrafficLight
} = require('./physical-traffic-light');

module.exports = {
  Device,
  DeviceManager,
  RED, YELLOW, GREEN,
  ON, OFF,
  PhysicalLight, PhysicalTrafficLight
};
