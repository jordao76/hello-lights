let EventEmitter = require('events');

///////////////

/** @abstract */
class Device extends EventEmitter {

  constructor(isConnected=true) {
    super();
    this.isConnected = isConnected;
  }

  /** @abstract */
  turn(lightID, onOff) {
    throw new Error('Device.turn is abstract');
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

module.exports = Device;
