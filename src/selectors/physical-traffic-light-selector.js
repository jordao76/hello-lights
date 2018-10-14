const EventEmitter = require('events');

////////////////////////////////////////////////

// the default device manager
const {Manager} = require('../devices/cleware-switch1');

////////////////////////////////////////////////

/**
 * Selects a physical traffic light to use.
 * @memberof selectors
 * @extends EventEmitter
 * @package
 */
class PhysicalTrafficLightSelector extends EventEmitter {

  /**
   * Selects a physical traffic light to use.
   * Checks-out and uses a specific traffic light or the first available one
   * to issue commands.
   * @see physical.DeviceManager#startMonitoring
   * @param {object} [options] - Options.
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
       * Fired for any traffic light that gets enabled.
       * @event selectors.PhysicalTrafficLightSelector#enabled
       */
      this.emit('enabled'));
  }

  /**
   * Called to close this instance and to stop monitoring for devices.
   * Should be done as the last operation before exiting the process.
   * @see physical.DeviceManager#stopMonitoring
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
       * @event selectors.PhysicalTrafficLightSelector#disabled
       */
      this.emit('disabled');
    });
  }

  /**
   * Logs information about known devices.
   * @param {object} [logger=console] - A Console-like object for logging.
   */
  logInfo(logger = console) {
    this.manager.logInfo(logger);
  }

}

////////////////////////////////////////////////

module.exports = {
  PhysicalTrafficLightSelector,
  SelectorCtor: PhysicalTrafficLightSelector
};
