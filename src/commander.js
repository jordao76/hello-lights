////////////////////////////////////////////////

const fs = require('fs');
const util = require('util');

////////////////////////////////////////////////

function tryRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
}

////////////////////////////////////////////////

// The default Selector constructor.
// This is an optional requirement since when used in a web context
// it would fail because of further USB-related dependencies.
// Browserify won't pick it up since the `require` call is encapsulated in `tryRequire`.
// If DefaultSelectorCtor is null, then it's a mandatory option to the Commander ctor.
const DefaultSelectorCtor = tryRequire('./selectors/physical-traffic-light-selector').SelectorCtor;

////////////////////////////////////////////////

function makeDefaultInterpreter() {
  const {Interpreter} = require('./commands/interpreter');
  const interpreter = new Interpreter();
  // define all commands
  require('./traffic-light/traffic-light-commands').defineCommands(interpreter);
  require('./traffic-light/multi-traffic-light-commands').defineCommands(interpreter);
  return interpreter;
}

////////////////////////////////////////////////

function makeDefaultFormatter() {
  const {MetaFormatter} = require('./commands/meta-formatter');
  return new MetaFormatter();
}

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
   * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
   *   a command.
   * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
   * @param {object} [options.selector] - The traffic light selector to use.
   *   Takes precedence over `options.SelectorCtor`.
   * @param {function} [options.SelectorCtor] - The constructor of a traffic
   *   light selector to use. Will be passed the entire `options` object.
   *   Ignored if `options.selector` is set.
   */
  constructor(options = {}) {
    let {
      logger = console,
      formatter = makeDefaultFormatter(),
      interpreter = makeDefaultInterpreter(),
      selector = null,
      SelectorCtor = DefaultSelectorCtor
    } = options;
    this.logger = logger;
    this.formatter = formatter;
    this.interpreter = interpreter;
    this.selector = selector || new SelectorCtor(options);
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
  async cancel() {
    this.interpreter.cancel();
  }

  _interrupt() {
    if (!this.running) return;
    this.isInterrupted = true;
    this.interpreter.cancel();
  }

  /**
   * Executes a file with command definitions asynchronously.
   * @param {string} filePath - Path to the file to execute.
   *   Should only contain command definitions (`define` or `def`).
   * @param {string} [encoding='utf8'] - Encoding of the file.
   */
  async runDefinitionsFile(filePath, encoding = 'utf8') {
    let command = await this._readFile(filePath, encoding);
    if (command) return this.runDefinitions(command);
  }

  /**
   * Executes a command with definitions asynchronously.
   * @param {string} command - Command to execute. Should only contain command
   *   definitions (`define` or `def`).
   */
  async runDefinitions(command) {
    try {
      this.logger.log('running definitions');
      await this.interpreter.execute(command); // no context, only for definitions
      this.logger.log('finished definitions');
    } catch (e) {
      this.logger.error('error in definitions');
      this.logger.error(e.message);
    }
  }

  /**
   * Executes a command file asynchronously.
   * If the same command is already running, does nothing.
   * If another command is running, cancels it, resets the traffic light,
   * and runs the new command.
   * If no command is running, executes the given command, optionally
   * resetting the traffic light based on the `reset` parameter.
   * If there's no traffic light to run the command, stores it for later when
   * one becomes available. Logs messages appropriately.
   * @param {string} filePath - Path to the file to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light
   *   before executing the command.
   * @param {string} [encoding='utf8'] - Encoding of the file.
   */
  async runFile(filePath, reset = false, encoding = 'utf8') {
    let command = await this._readFile(filePath, encoding);
    if (command) return this.run(command, reset);
  }

  async _readFile(filePath, encoding) {
    try {
      if (!fs.readFileAsync) fs.readFileAsync = util.promisify(fs.readFile);
      return await fs.readFileAsync(filePath, encoding);
    } catch (e) {
      this.logger.error(`error accessing file '${filePath}'`);
      this.logger.error(e.message);
      return null;
    }
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
      this.logger.log('no traffic light available');
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
    this.interpreter.cancel();
    await tl.reset();
  }

  _skipIfRunningSame(command, tl) {
    if (this.running !== command) return false;
    return true;
  }

  async _execute(command, tl, reset) {
    if (reset) await tl.reset();
    this.logger.log(`${tl}: running`);
    this.running = command;
    let res = await this.interpreter.execute(command, {tl});
    if (command === this.running) this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    if (this.isInterrupted || !tl.isEnabled) {
      let state = this.isInterrupted ? 'interrupted' : 'disabled';
      this.logger.log(`${tl}: ${state}, suspending running command`);
      this.suspended = command;
      this.isInterrupted = false;
      this._resumeIfNeeded(); // try to resume in another traffic light
    } else {
      this.suspended = null;
      this.logger.log(`${tl}: finished`);
    }
  }

  _errorInExecution(command, tl, error) {
    if (command === this.running) this.running = null;
    this.logger.error(`${tl}: error in command`);
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
   * Fetches all supported command names.
   * @returns {Promise<string[]>} A promise that resolves with the command names.
   */
  async fetchCommandNames() {
    return this.interpreter.commandNames;
  }

  /**
   * Logs the help info for the given command name.
   * @param {string} commandName - Name of the command to log help info.
   */
  async help(commandName) {
    let command = this.interpreter.lookup(commandName);
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    this.logger.log(this.formatter.format(command.meta));
  }

  /**
   * Logs information about known traffic lights.
   */
  async logInfo() {
    this.selector.logInfo(this.logger);
  }

}

////////////////////////////////////////////////

/**
 * Factory for a Commander that deals with a single physical traffic light.
 * It will get the first available traffic light for use.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
 *   a command.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @param {physical.DeviceManager} [options.manager] - The Device Manager to use.
 * @param {string|number} [options.serialNum] - The serial number of the
 *   traffic light to use, if available. Cleware USB traffic lights have
 *   a numeric serial number.
 * @returns {Commander} A single traffic light commander.
 */
Commander.single = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-traffic-light-selector');
  const selector = new SelectorCtor(options);
  const commander = new Commander({...options, selector});
  commander.manager = selector.manager;
  return commander;
};

////////////////////////////////////////////////

/**
 * Factory for a Commander that deals with multiple physical traffic lights.
 * It will greedily get all available traffic lights for use.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
 *   a command.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @param {physical.DeviceManager} [options.manager] - The physical Device Manager to use.
 * @returns {Commander} A multiple traffic lights commander.
 */
Commander.multi = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-multi-traffic-light-selector');
  const selector = new SelectorCtor(options);
  const commander = new Commander({...options, selector});
  commander.manager = selector.manager;
  return commander;
};

////////////////////////////////////////////////

module.exports = {Commander};
