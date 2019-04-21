////////////////////////////////////////////////

const tryRequire = (path) => {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
};

////////////////////////////////////////////////

// The default Selector constructor.
// This is an optional requirement since when used in a web context
// it would fail because of further USB-related dependencies.
// Browserify won't pick it up since the `require` call is encapsulated in
// `tryRequire`.
// If SelectorCtor is null, then it's a mandatory option to the Commander ctor.
const {SelectorCtor} = tryRequire('./selectors/physical-traffic-light-selector');

////////////////////////////////////////////////

const {Interpreter} = require('./commands/interpreter');
const {defineCommands} = require('./traffic-light/traffic-light-commands'); // TODO: put this in a base TrafficLightSelector class
// the default command interpreter
const DefaultInterpreter = new Interpreter();
defineCommands(DefaultInterpreter);

////////////////////////////////////////////////

/**
 * Issues commands to control a traffic light.
 */
class Commander {

  /**
   * Creates a new Commander instance.
   * @param {object} [options] - Commander options.
   * @param {object} [options.logger=console] - A Console-like object for logging,
   *   with a log and an error function.
   * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
   * @param {object} [options.selector] - The traffic light selector to use.
   *   Takes precedence over `options.selectorCtor`.
   * @param {function} [options.selectorCtor] - The constructor of a traffic
   *   light selector to use. Will be passed the entire `options` object.
   *   Ignored if `options.selector` is set.
   * @param {physical.DeviceManager} [options.manager] - The Device Manager to use.
   *   This is an option for the default `options.selectorCtor`.
   * @param {string|number} [options.serialNum] - The serial number of the
   *   traffic light to use, if available. Cleware USB traffic lights have
   *   a numeric serial number.
   *   This is an option for the default `options.selectorCtor`.
   */
  constructor(options = {}) {
    let {
      logger = console,
      interpreter = DefaultInterpreter,
      selector = null,
      selectorCtor = SelectorCtor
    } = options;
    this.logger = logger;
    this.interpreter = interpreter;

    this.selector = selector || new selectorCtor({...options, logger, interpreter}); // eslint-disable-line new-cap
    this.selector.on('enabled', () => this._resumeIfNeeded());
    this.selector.on('disabled', () => this.cancel());
    this.selector.on('interrupted', () => this._interrupt());
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
    this.interpreter.cancel();
  }

  _interrupt() {
    if (!this.running) return;
    this.isInterrupted = true;
    this.interpreter.cancel();
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
    this.interpreter.cancel();
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
    let res = await this.interpreter.execute(command, {tl});
    if (command === this.running) this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    if (this.isInterrupted || !tl.isEnabled) {
      let state = this.isInterrupted ? 'interrupted' : 'disabled';
      this.logger.log(`${tl}: ${state}, suspending '${command}'`);
      this.suspended = command;
      this.isInterrupted = false;
      this._resumeIfNeeded(); // try to resume in another traffic light
    } else {
      this.suspended = null;
      this.logger.log(`${tl}: finished '${command}'`);
    }
  }

  _errorInExecution(command, tl, error) {
    if (command === this.running) this.running = null;
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
   * All supported command names.
   * @type {string[]}
   */
  get commandNames() {
    return this.interpreter.commandNames;
  }

  /**
   * All supported commands indexed by their names.
   * @type {object.<string, commands.Command>}
   */
  get commands() {
    return this.interpreter.commands;
  }

  /**
   * Logs the help info for the given command name.
   * @param {string} commandName - Name of the command to log help info.
   */
  help(commandName) {
    let command = this.interpreter.commands[commandName];
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    const validationText = p => p.validate ? ` (${p.validate.exp})` : '';
    let params = command.meta.params.map(p => ':' + p.name + validationText(p)).join(' ');
    if (params.length > 0) params = ' ' + params;
    this.logger.log(`${command.meta.name}${params}`);
    this.logger.log(command.meta.desc);
  }

  /**
   * Logs information about known traffic lights.
   */
  logInfo() {
    this.selector.logInfo(this.logger);
  }

}

////////////////////////////////////////////////

/**
 * Factory for a Commander that deals with multiple traffic lights.
 * It will greedily get all available traffic lights for use and add commands
 * to deal with multiple traffic lights.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @returns {Commander} A multi-traffic-light commander.
 */
Commander.multi = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-multi-traffic-light-selector');
  let {selectorCtor = SelectorCtor} = options;
  return new Commander({...options, selectorCtor});
};

////////////////////////////////////////////////

module.exports = {Commander};
