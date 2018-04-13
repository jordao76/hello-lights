let {PhysicalTrafficLight} = require('./physical-traffic-light');
let EventEmitter = require('events');

///////////////

/**
 * A physical device that can turn lights on of off.
 * @abstract
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
   * The physical traffic light that uses this device.
   * @returns {PhysicalTrafficLight} The physical traffic light that uses
   *   this device.
   */
  trafficLight() {
    if (this.tl) return this.tl;
    return this.tl = new PhysicalTrafficLight(this);
  }

  /**
   * Marks this device as connected.
   * @fires Device#connected
   */
  connect() {
    if (this.isConnected) return;
    this.isConnected = true;
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
     * Connected event.
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

  /**
   * All connected devices.
   * @return {Device[]} Connected devices.
   */
  connectedDevices() {
    return this.allDevices()
      .filter(device => device.isConnected);
  }

  /**
   * The first connected device.
   * @return {Device} The first connected device, or null if there isn't one.
   */
  firstConnectedDevice() {
    let connectedDevices = this.connectedDevices();
    if (connectedDevices.length === 0) return null;
    return connectedDevices[0];
  }

  /**
   * The first traffic light associated with the first connected device.
   * @returns {PhysicalTrafficLight} The physical traffic light associated
   *   with the first connected device.
   */
  firstConnectedTrafficLight() {
    let device = this.firstConnectedDevice();
    if (!device) return null;
    return device.trafficLight();
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
