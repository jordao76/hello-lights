let EventEmitter = require('events');

class Device extends EventEmitter {
  constructor(isConnected=true) {
    super();
    this.isConnected = isConnected;
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

module.exports = Device;
