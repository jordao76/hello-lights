const EventEmitter = require('events');
const {FlexMultiTrafficLight} = require('../traffic-light/multi-traffic-light');

////////////////////////////////////////////////

// the default device manager
const {Manager} = require('../devices/cleware-switch1');

////////////////////////////////////////////////

/**
 * Selects all available physical traffic lights to use in a composite.
 * @memberof selectors
 * @extends EventEmitter
 * @package
 */
class PhysicalMultiTrafficLightSelector extends EventEmitter {

  /**
   * Selects all available physical traffic lights to use.
   * Checks-out and uses all available traffic lights to issue commands.
   * @param {object} [options] - Options.
   * @param {physical.DeviceManager} [options.manager] - The Device Manager to use.
   */
  constructor({manager = Manager} = {}) {
    super();
    this.manager = manager;
    this._setupTrafficLight();
  }

  _setupTrafficLight() {
    this.manager.startMonitoring();
    this.trafficLight = new FlexMultiTrafficLight(this._retrieveTrafficLights());
    this.trafficLight.on('enabled', () =>
      /**
       * Fired when the multi traffic light gets enabled.
       * @event selectors.PhysicalMultiTrafficLightSelector#enabled
       */
      this.emit('enabled'));
    this.trafficLight.on('disabled', () =>
      /**
       * Fired when the multi traffic light gets disabled.
       * @event selectors.PhysicalMultiTrafficLightSelector#disabled
       */
      this.emit('disabled'));
    this.trafficLight.on('interrupted', () =>
      /**
       * Fired when the multi traffic light gets interrupted.
       * @event selectors.PhysicalMultiTrafficLightSelector#interrupted
       */
      this.emit('interrupted'));
    this.manager.on('added', () => this._refreshTrafficLights());
  }

  _refreshTrafficLights() {
    this._retrieveTrafficLights()
      .forEach(tl => this.trafficLight.add(tl));
  }

  _retrieveTrafficLights() {
    return this.manager.allDevices()
      .map(device => device.trafficLight)
      .filter(tl => tl.isAvailable);
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
   * Retrieves a multi traffic light for exclusive usage of the caller,
   * or `null` if no traffic lights are available.
   * @returns {trafficLight.FlexMultiTrafficLight} - A multi traffic light, or `null`.
   */
  resolveTrafficLight() {
    if (!this.manager.supportsMonitoring()) {
      this._refreshTrafficLights();
    }
    if (this.trafficLight.isEnabled) return this.trafficLight;
    return null;
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
  PhysicalMultiTrafficLightSelector,
  SelectorCtor: PhysicalMultiTrafficLightSelector
};
