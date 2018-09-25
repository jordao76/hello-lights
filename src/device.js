let {PhysicalTrafficLight} = require('./physical-traffic-light');
let EventEmitter = require('events');

///////////////

/**
 * A physical device that can turn lights on or off.
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
   * @type {PhysicalTrafficLight}
   */
  get trafficLight() {
    if (this._tl) return this._tl;
    return this._tl = new PhysicalTrafficLight(this);
  }

  /**
   * Marks this device as connected.
   * @fires Device#connected
   */
  connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    this.trafficLight.sync();
    /**
     * Connected event.
     * @event Device#connected
     */
    this.emit('connected');
  }

  /**
   * Marks this device as disconnected.
   * @fires Device#disconnected
   */
  disconnect() {
    if (!this.isConnected) return;
    this.isConnected = false;
    /**
     * Disconnected event.
     * @event Device#disconnected
     */
    this.emit('disconnected');
  }

  /**
   * Registers a callback to the connected event.
   * @param {function} cb - Callback to register.
   */
  onConnected(cb) { this.on('connected', cb); }

  /**
   * Registers a callback to the disconnected event.
   * @param {function} cb - Callback to register.
   */
  onDisconnected(cb) { this.on('disconnected', cb); }

}

///////////////

/**
 * A Device Manager.
 * @abstract
 * @extends EventEmitter
 */
class DeviceManager extends EventEmitter {

  /**
   * Starts monitoring for devices.
   * @fires DeviceManager#added
   * @fires DeviceManager#removed
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
   * @return {Device[]} All devices being managed.
   */
  allDevices() {
    throw new Error('DeviceManager#allDevices is abstract');
  }

}

/**
 * Device added event.
 * A monitoring Device Manager should fire this event
 * when a device is added (connected).
 * @event DeviceManager#added
 */

/**
 * Device removed event.
 * A monitoring Device Manager should fire this event
 * when a device is removed (disconnected).
 * @event DeviceManager#removed
 */

///////////////

module.exports = {
  Device,
  DeviceManager
};
