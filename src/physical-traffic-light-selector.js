const EventEmitter = require('events');

////////////////////////////////////////////////

// the default device manager
const {Manager} = require('./devices/cleware-switch1');

////////////////////////////////////////////////

/**
 * Selects a physical traffic light to use.
 * @extends EventEmitter
 * @package
 */
class PhysicalTrafficLightSelector extends EventEmitter {

  /**
   * Selects a physical traffic light to use.
   * Checks-out and uses a specific traffic light or the first available one
   * to issue commands.
   * @see DeviceManager#startMonitoring
   * @param {Object} [options] - Options.
   * @param {DeviceManager} [options.manager] - The Device Manager to use.
   * @param {string|number} [options.serialNum] - The serial number of the
   *   traffic light to use, if available. Cleware USB traffic lights have
   *   a numeric serial number.
   */
  constructor({manager = Manager, serialNum = null} = {}) {
    super();
    this.manager = manager;
    this.serialNum = serialNum;
    this.devicesBySerialNum = {};

    this.manager.startMonitoring();
    this.manager.on('added', () =>
      /**
       * Traffic light enabled event.
       * Fired for any new or old traffic light that gets enabled.
       * @event PhysicalTrafficLightSelector#enabled
       */
      this.emit('enabled'));
  }

  /**
   * Called to close this instance and to stop monitoring for devices.
   * Should be done as the last operation before exiting the process.
   * @see DeviceManager#stopMonitoring
   */
  close() {
    this.manager.stopMonitoring();
  }

  /**
   * Retrieves a traffic light for exclusive usage of the caller,
   * or `null` if one could not be found or checked-out.
   * Traffic lights are released (checked-in) when disconnected.
   * @returns {PhysicalTrafficLight} - A traffic light, or `null`.
   */
  resolveTrafficLight() {
    if (this._device) return this._device.trafficLight;
    let device = this._selectDevice();
    if (!device || !device.trafficLight.checkOut()) return null;
    this._device = device;
    this._registerDeviceIfNeeded(device);
    return device.trafficLight;
  }

  _selectDevice() {
    let devices = this.manager.allDevices()
      .filter(d => d.trafficLight.isAvailable);
    return this.serialNum
      ? devices.filter(d => d.serialNum == this.serialNum)[0] // eslint-disable-line eqeqeq
      : devices[0];
  }

  _registerDeviceIfNeeded(device) {
    let sn = device.serialNum;
    if (this.devicesBySerialNum[sn]) return;
    this.devicesBySerialNum[sn] = device;
    device.on('disconnected', () => {
      if (this._device !== device) return;
      device.trafficLight.checkIn();
      this._device = null;
      /**
       * Traffic light disabled event.
       * Only fired for the specific traffic light that was checked-out.
       * @event PhysicalTrafficLightSelector#disabled
       */
      this.emit('disabled');
    });
  }

  /**
   * Returns information about known devices.
   * Known devices are either connected devices or
   * devices that were once connected and then got disconnected.
   * @returns {PhysicalTrafficLightSelector~DeviceInfo[]} Device info list.
   */
  info() {
    let devices = this.manager.allDevices();
    return devices.map(d => ({
      type: this.manager.type,
      serialNum: d.serialNum,
      status: d.isConnected ? 'connected' : 'disconnected'
    }));
  }

  /**
   * Logs information about known devices.
   * @param {Object} [logger=console] - A Console-like object for logging,
   *   with a log function.
   * @see PhysicalTrafficLightSelector#info
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
 * @typedef {object} PhysicalTrafficLightSelector~DeviceInfo
 * @property {string} type - The type of the device.
 * @property {(string|number)} serialNum - The serial number of the device.
 * @property {string} status - The status of the device, either
 *   'connected' or 'disconnected'.
 */

////////////////////////////////////////////////

module.exports = {
  PhysicalTrafficLightSelector,
  SelectorCtor: PhysicalTrafficLightSelector
};
