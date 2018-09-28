////////////////////////////////////////////////

const {PhysicalTrafficLightSelector} = require('./physical-traffic-light-selector');

////////////////////////////////////////////////

const {CommandParser} = require('./parsing/command-parser');
const {defineCommands} = require('./traffic-light-commands');
// the default command parser
const Parser = new CommandParser();
defineCommands(Parser);

////////////////////////////////////////////////

/**
 * Issues commands to control a traffic light.
 */
class Commander {

  /**
   * Creates a new Commander instance.
   * @param {Object} [options] - Commander options.
   * @param {Object} [options.logger=console] - A Console-like object for logging,
   *   with a log and an error function.
   * @param {CommandParser} [options.parser] - The Command Parser to use.
   * @param {DeviceManager} [options.manager] - The Device Manager to use.
   * @param {string|number} [options.serialNum] - The serial number of the
   *   traffic light to use, if available. Cleware USB traffic lights have
   *   a numeric serial number.
   */
  constructor(options = {}) {
    let {
      logger = console,
      parser = Parser
    } = options;
    this.logger = logger;
    this.parser = parser;

    this.selector = new PhysicalTrafficLightSelector(options);
    this.selector.on('enabled', () => this._resumeIfNeeded());
    this.selector.on('disabled', () => this.cancel());
  }

  /**
   * Called to close this instance.
   * Should be done as the last operation before exiting the process.
   */
  close() {
    this.selector.close();
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
   * If there's no traffic light to run the command, stores it for later when
   * one becomes available. Logs messages appropriately.
   * @param {string} command - Command to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light
   *   before executing the command.
   */
  async run(command, reset = false) {
    let tl = this.selector.resolveTrafficLight();
    if (!tl) {
      this.suspended = command;
      this.logger.log(`no traffic light available to run '${command}'`);
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
    this.logger.log(`${tl}: cancel '${this.running}'`);
    this.parser.cancel();
    await tl.reset();
  }

  _skipIfRunningSame(command, tl) {
    if (this.running !== command) return false;
    this.logger.log(`${tl}: skip '${command}'`);
    return true;
  }

  async _execute(command, tl, reset) {
    if (reset) await tl.reset();
    this.logger.log(`${tl}: running '${command}'`);
    this.running = command;
    let res = await this.parser.execute(command, {tl});
    this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    if (tl.isEnabled) {
      this.suspended = null;
      this.logger.log(`${tl}: finished '${command}'`);
    } else {
      this.suspended = command;
      this.logger.log(`${tl}: disabled, suspending '${command}'`);
      this._resumeIfNeeded(); // try to resume in another traffic light
    }
  }

  _errorInExecution(command, tl, error) {
    this.running = null;
    this.logger.error(`${tl}: error in '${command}'`);
    this.logger.error(error.message);
  }

  _resumeIfNeeded() {
    let command = this.suspended;
    if (!command) return;
    this.suspended = null;
    this.run(command, true); // no await
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

  /**
   * Logs information about known traffic lights.
   */
  logInfo() {
    this.selector.logInfo(this.logger);
  }

}

////////////////////////////////////////////////

module.exports = {Commander};
