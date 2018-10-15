const {PhysicalTrafficLight} = require('../physical/physical-traffic-light');
const EventEmitter = require('events');

////////////////////////////////////////////////

/**
 * A physical device that can turn lights on or off.
 * @memberof physical
 * @abstract
 * @extends EventEmitter
 */
class Device extends EventEmitter {

  /**
   * @param {(string|number)} serialNum - The unique serial number of the
   *   device.
   * @param {boolean} [isConnected=true] - If the device is connected.
   */
  constructor(serialNum, isConnected = true) {
    super();
    /**
     * The unique serial number of the device.
     * @type {(string|number)}
     */
    this.serialNum = serialNum;
    /**
     * If the device is connected.
     * @type {boolean}
     */
    this.isConnected = isConnected;
  }

  /* istanbul ignore next */
  /**
   * Turns a light on or off.
   * @abstract
   * @param {number} lightID - Zero-based index of the light to turn:
   *   0 is red, 1 is yellow and 2 is green.
   * @param {number} onOff - On (1) or off (0).
   */
  turn(lightID, onOff) {
    throw new Error('Device#turn is abstract');
  }

  /**
   * The physical traffic light associated with this device.
   * @type {physical.PhysicalTrafficLight}
   */
  get trafficLight() {
    if (this._tl) return this._tl;
    return this._tl = new PhysicalTrafficLight(this);
  }

  /**
   * Marks this device as connected.
   * @fires physical.Device#connected
   */
  connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    this.trafficLight.sync();
    /**
     * Connected event.
     * @event physical.Device#connected
     */
    this.emit('connected');
  }

  /**
   * Marks this device as disconnected.
   * @fires physical.Device#disconnected
   */
  disconnect() {
    if (!this.isConnected) return;
    this.isConnected = false;
    /**
     * Disconnected event.
     * @event physical.Device#disconnected
     */
    this.emit('disconnected');
  }

}

////////////////////////////////////////////////

/**
 * A Device Manager.
 * @memberof physical
 * @abstract
 * @extends EventEmitter
 */
class DeviceManager extends EventEmitter {

  /**
   * Starts monitoring for devices.
   * @fires physical.DeviceManager#added
   * @fires physical.DeviceManager#removed
   */
  startMonitoring() { }

  /**
   * Stops monitoring for devices.
   */
  stopMonitoring() { }

  /**
   * @param {string} type - The type of device managed.
   */
  constructor(type) {
    super();
    this.type = type;
  }

  /* istanbul ignore next */
  /**
   * All devices being managed.
   * @abstract
   * @return {physical.Device[]} All devices being managed.
   */
  allDevices() {
    throw new Error('DeviceManager#allDevices is abstract');
  }

  /**
   * Returns information about known devices.
   * Known devices are either connected devices or
   * devices that were once connected and then got disconnected.
   * @returns {physical.DeviceInfo[]} Device info list.
   */
  info() {
    let devices = this.allDevices();
    return devices.map(d => ({
      type: this.type,
      serialNum: d.serialNum,
      status: d.isConnected ? 'connected' : 'disconnected'
    }));
  }

  /**
   * Logs information about known devices.
   * @param {object} [logger=console] - A Console-like object for logging,
   *   with a log function.
   * @see physical.DeviceManager#info
   */
  logInfo(logger = console) {
    let devicesInfo = this.info();
    if (devicesInfo.length === 0) {
      logger.log('No devices found');
    } else {
      logger.log('Known devices:');
      devicesInfo.forEach(info =>
        logger.log(`device ${info.serialNum}: ${info.status}`));
    }
  }

}

////////////////////////////////////////////////

/**
 * Device added event.
 * A monitoring Device Manager should fire this event
 * when a device is added (connected).
 * @event physical.DeviceManager#added
 */

/**
 * Device removed event.
 * A monitoring Device Manager should fire this event
 * when a device is removed (disconnected).
 * @event physical.DeviceManager#removed
 */

////////////////////////////////////////////////

/**
 * @typedef {object} DeviceInfo
 * @memberof physical
 * @property {string} type - The type of the device.
 * @property {(string|number)} serialNum - The serial number of the device.
 * @property {string} status - The status of the device, either
 *   'connected' or 'disconnected'.
 */

////////////////////////////////////////////////

module.exports = {
  Device,
  DeviceManager
};
