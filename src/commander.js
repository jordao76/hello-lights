let {CommandParser} = require('./command-parser');
let defineCommands = require('./traffic-light-commands.cljs');

////////////////////////////////////////////////

// the default command parser
let Parser = new CommandParser();
defineCommands(Parser);

// the default device manager
let {Manager} = require('./devices/cleware-switch1');

// the default logger
let Logger = {
  log: console.log,
  error: console.error
};

////////////////////////////////////////////////

/**
 * @typedef {Object} DeviceInfo
 * @property {string} type - The type of the device.
 * @property {(string|number)} serialNum - The serial number of the device.
 * @property {string} status - The status of the device, either
 *   'connected' or 'disconnected'.
 */

////////////////////////////////////////////////

/**
 * Issues commands to control a connected traffic light.
 */
class Commander {

  /**
   * Creates a new Commander instance.
   * Checks-out and uses the first available traffic light to issue commands.
   * An available traffic light is a connected traffic light that hasn't
   * been checked-out by another Commander instance.
   * (Technically it's the device that gets checked-out/in.)
   * @see DeviceManager#startMonitoring
   * @param {Object} [options] - Commander options.
   * @param {Object} [options.logger] - A Console-like object for logging, with
   *   a log and an error function.
   * @param {DeviceManager} [options.manager] - The Device Manager to use.
   * @param {CommandParser} [options.parser] - The Command Parser to use.
   */
  constructor({parser = Parser, manager = Manager, logger = Logger} = {}) {
    this.parser = parser;
    this.manager = manager;
    this.logger = logger;

    this.devicesBySerialNum = {}; // known devices by their serial numbers
    this.manager.startMonitoring();
    this.manager.on('added', () => this._resumeIfNeeded());
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
   * Returns information about known devices.
   * Known devices are either connected devices or
   * devices that were once connected and then got disconnected.
   * @returns {DeviceInfo[]} Device info list.
   */
  devicesInfo() {
    let devices = this.manager.allDevices();
    return devices.map(d => ({
      type: this.manager.type,
      serialNum: d.serialNum,
      status: d.isConnected ? 'connected' : 'disconnected'
    }));
  }

  /**
   * Logs information about known devices.
   * Known devices are either connected devices or
   * devices that were once connected and then got disconnected.
   * @see Commander#devicesInfo
   */
  logDevicesInfo() {
    let devicesInfo = this.devicesInfo();
    if (devicesInfo.length === 0) {
      this.logger.log('No devices found');
    } else {
      this.logger.log('Known devices:');
      devicesInfo.forEach(info =>
        this.logger.log(`device ${info.serialNum}: ${info.status}`));
    }
  }

  /**
   * Cancels any currently executing command.
   */
  cancel() {
    this.parser.cancel();
  }

  /**
   * Executes a command asynchronously.
   * If the same command is already running, does nothing.
   * If another command is running, cancels it, resets the traffic light,
   * and runs the new command.
   * If no command is running, executes the given command, optionally
   * resetting the traffic light based on the `reset` parameter.
   * If there's no connected device, stores the command for execution if
   * a device is connected later. Logs messages appropriately.
   * @param {string} command - Command to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light
   *   before executing the command.
   */
  async run(command, reset = false) {
    let tl = await this._resolveTrafficLight();
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
    } else {
      this.suspended = command;
      log(`device ${sn}: disconnected, suspending '${command}'`);
    }
  }

  _errorInExecution(command, tl, error) {
    let sn = tl.device.serialNum;
    let err = this.logger.error;
    this.running = null;
    err(`device ${sn}: error in '${command}'`);
    err(error.message);
  }

  _resumeIfNeeded() {
    let command = this.suspended;
    if (!command) return;
    this.suspended = null;
    this.run(command, true); // no await
  }

  async _resolveTrafficLight() {
    if (this._device) return this._device.trafficLight();
    let device = await this.manager.firstAvailableDevice();
    if (!device || !device.checkOut()) return null;
    this._device = device;
    this._registerDeviceIfNeeded(device);
    return device.trafficLight();
  }

  _registerDeviceIfNeeded(device) {
    let sn = device.serialNum;
    if (this.devicesBySerialNum[sn]) return;
    this.devicesBySerialNum[sn] = device;
    device.onDisconnected(() => {
      if (this._device !== device) return;
      device.checkIn();
      this._device = null;
      this.cancel();
    });
  }

  /**
   * Returns a list of supported command names.
   * @returns {string[]} List of supported command names.
   */
  commands() {
    return this.parser.commandList;
  }

  /**
   * Logs the help info for the given command name.
   * @param {string} commandName - Name of the command to log help info.
   * @see Commander#commands
   */
  help(commandName) {
    let command = this.parser.commands[commandName];
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    let paramNames = command.paramNames, params = '';
    if (paramNames && paramNames.length > 0) {
      params = ' ' + paramNames.map(n => ':' + n).join(' ');
    }
    this.logger.log(`${command.doc.name}${params}`);
    this.logger.log(command.doc.desc);
  }

}

////////////////////////////////////////////////

module.exports = {Commander};
