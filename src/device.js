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

module.exports = {Device};
