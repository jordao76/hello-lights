let {CommandParser} = require('./command-parser');
let defineCommands = require('./traffic-light-commands.cljs');

////////////////////////////////////////////////

// the default command parser
let Parser = new CommandParser();
defineCommands(Parser);

// the default device manager
let {Manager} = require('./devices/cleware-switch1');

////////////////////////////////////////////////

class Commander {

  constructor(options = {parser: Parser, manager: Manager, logger: console}) {
    this.parser = options.parser;
    this.manager = options.manager;
    this.logger = options.logger;

    this.devicesBySerialNum = {}; // known devices by their serial numbers
    this.manager.startMonitoring();
    this.manager.on('add', () => this._resumeIfNeeded());
  }

  devicesInfo() {
    let devices = this.manager.allDevices();
    return devices.map(d => {
      return {
        type: this.manager.type,
        serialNum: d.serialNum,
        status: d.isConnected ? 'connected' : 'disconnected'
      };
    });
  }

  logDevicesInfo() {
    this.devicesInfo().forEach(info =>
      this.logger.log(`device ${info.serialNum}: ${info.status}`));
  }

  cancel() {
    this.parser.cancel();
  }

  async run(command, reset = false) {
    let tl = await this._trafficLight();
    if (!tl) {
      this.suspended = command;
      this.logger.log(`no device available to run '${command}'`);
      return;
    }
    try {
      if (this._skipIfRunningSame(command, tl)) return;
      await this._cancelIfRunningDifferent(command, tl);
      return await this._execute(command, tl, reset);
    } catch (e) {
      this._errorInExecution(command, tl, e);
    }
  }

  async _cancelIfRunningDifferent(command, tl) {
    if (!this.running || this.running === command) return;
    let sn = tl.device.serialNum;
    this.logger.log(`device ${sn}: cancel '${this.running}'`);
    this.parser.cancel();
    await tl.reset();
  }

  _skipIfRunningSame(command, tl) {
    if (this.running !== command) return false;
    let sn = tl.device.serialNum;
    this.logger.log(`device ${sn}: skip '${command}'`);
    return true;
  }

  async _execute(command, tl, reset) {
    if (reset) await tl.reset();
    let sn = tl.device.serialNum;
    let log = this.logger.log;
    log(`device ${sn}: running '${command}'`);
    this.running = command;
    let res = await this.parser.execute(command, tl);
    this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    let sn = tl.device.serialNum;
    let log = this.logger.log;
    if (tl.device.isConnected) {
      this.suspended = null;
      log(`device ${sn}: finished '${command}'`);
    }
    else {
      this.suspended = command;
      log(`device ${sn}: disconnected, suspending '${command}'`);
    }
  }

  _errorInExecution(command, tl, error) {
    let sn = tl.device.serialNum;
    let err = this.logger.error;
    this.running = null;
    err(`device ${sn}: error in '${command}'`);
    err(error);
  }

  _resumeIfNeeded() {
    let command = this.suspended;
    if (!command) return;
    this.suspended = null;
    this.run(command, true); // no await
  }

  async _trafficLight() {
    let device = await this.manager.firstConnectedDevice();
    if (!device) return null;
    this._registerDeviceIfNeeded(device);
    return device.trafficLight();
  }

  _registerDeviceIfNeeded(device) {
    let sn = device.serialNum;
    if (this.devicesBySerialNum[sn]) return;
    this.devicesBySerialNum[sn] = device;
    device.onConnected(() => {
      device.trafficLight().sync(); // no await
      this.logger.log(`device ${sn}: connected`);
    });
    device.onDisconnected(() => this.cancel());
  }

}

////////////////////////////////////////////////

module.exports = {Commander};
