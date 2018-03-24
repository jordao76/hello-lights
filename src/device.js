let {PhysicalTrafficLight} = require('./physical-traffic-light');
let EventEmitter = require('events');

///////////////

/** @abstract */
class Device extends EventEmitter {

  constructor(serialNum, isConnected = true) {
    super();
    // Serial Numbers are unique per device
    this.serialNum = serialNum;
    this.isConnected = isConnected;
  }

  /** @abstract */
  turn(lightID, onOff) {
    throw new Error('Device#turn is abstract');
  }

  trafficLight() {
    if (this.tl) return this.tl;
    return this.tl = new PhysicalTrafficLight(this);
  }

  connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    this.emit('connected');
  }

  disconnect() {
    if (!this.isConnected) return;
    this.isConnected = false;
    this.emit('disconnected');
  }

  onConnected(cb) { this.on('connected', cb); }
  onDisconnected(cb) { this.on('disconnected', cb); }

}

///////////////

/** @abstract */
class DeviceManager {

  constructor(type) {
    this.type = type;
  }

  /** @abstract */
  allDevices() {
    throw new Error('DeviceManager#allDevices is abstract');
  }

  connectedDevices() {
    return this.allDevices()
      .filter(device => device.isConnected);
  }

  firstConnectedDevice() {
    let connectedDevices = this.connectedDevices();
    if (connectedDevices.length === 0) return null;
    return connectedDevices[0];
  }

  firstConnectedTrafficLight() {
    let device = this.firstConnectedDevice();
    if (!device) return null;
    return device.trafficLight();
  }

}

///////////////

module.exports = {
  Device,
  DeviceManager
};
