/////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
const util = require('util');

/////////////////////////////////////////////////////////////////////////////

const {FlatScope} = require('./scope');
const {Parser} = require('./parser');
const {Analyzer} = require('./analyzer');
const {Generator} = require('./generator');
const {Cancellable} = require('./cancellable');

/////////////////////////////////////////////////////////////////////////////

const define = require('./define');
const $import = require('./import');
const baseCommands = require('./base-commands');

/////////////////////////////////////////////////////////////////////////////

/**
 * Command interpreter to execute command strings.
 * @memberof commands
 */
class Interpreter {

  /**
   * @param {object.<string, commands.Command>} [commands] - Commands this
   *   interpreter recognizes.
   * @param {boolean} [intrinsics=true] - Whether to add intrinsic commands
   *   to the interpreter scope (like 'define' and 'pause').
   */
  constructor(commands = {}, intrinsics = true) {
    let commandsInScope = {};
    if (intrinsics) {
      Object.assign(commandsInScope, {
        ...define.commands, // add the 'define' commands
        ...$import.commands, // add the 'import' command
        ...baseCommands.commands // add the base commands
      });
    }
    Object.assign(commandsInScope, commands);
    this.scope = new FlatScope(commandsInScope);
    this.parser = new Parser();
    this.analyzer = new Analyzer(this.scope);
    this.generator = new Generator();
    this.ct = new Cancellable();
  }

  /**
   * All commands indexed by their names.
   * @type {object.<string, commands.Command>}
   */
  get commands() {
    return this.scope.commands;
  }

  /**
   * Command names this interpreter recognizes.
   * @type {string[]}
   */
  get commandNames() {
    return this.scope.commandNames;
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.scope.add(name, command);
  }

  /**
   * Looks up a command this interpreter recognizes.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function or `null` if the command is not found.
   */
  lookup(name) {
    return this.scope.lookup(name);
  }

  /**
   * Cancels any executing commands.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   */
  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable();
    }
  }

  /**
   * Executes a command file asynchronously.
   * @param {string} filePath - Path to the file to execute.
   * @param {string} [encoding='utf8'] - Encoding of the file.
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands' context, together with the cancellation token.
   *   This context cannot have key 'ct', since it would be overwritten anyway.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   * @throws Throws an error for any issues accessing the file, or for any syntax
   *   or semantic errors in its text.
   * @returns {object[]} Array with the results of the executions of the commands
   *   found in the file.
   */
  async executeFile(filePath, encoding = 'utf8', ctx = {}, ct = this.ct) {
    if (!fs.readFileAsync) fs.readFileAsync = util.promisify(fs.readFile);
    return this.execute(await fs.readFileAsync(filePath, encoding), ctx, ct);
  }

  /**
   * Executes a command asynchronously.
   * @param {string} text - Command text to execute.
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands' context, together with the cancellation token.
   *   This context cannot have key 'ct', since it would be overwritten anyway.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   * @throws Throws an error for any syntax or semantic errors in the text.
   * @returns {object[]} Array with the results of the executions of the commands.
   */
  async execute(text, ctx = {}, ct = this.ct) {
    let commands = this.process(text);

    let res = [];
    for (let i = 0; i < commands.length; ++i) {
      if (ct.isCancelled) break;
      let command = commands[i];
      res.push(await command({...ctx, ct}));
    }

    if (ct === this.ct && ct.isCancelled) {
      // this.ct was cancelled, so re-instantiate it
      this.ct = new Cancellable();
    }

    return res;
  }

  process(text) {
    // parse
    let nodes = this.parser.parse(text);
    this.raiseIfErrors(this.parser.errors);

    // analyze
    nodes = this.analyzer.analyze(nodes);
    this.raiseIfErrors(this.analyzer.errors);

    // generate
    let commands = this.generator.generate(nodes);
    this.raiseIfErrors(this.generator.errors);

    return commands || [];
  }

  raiseIfErrors(errors) {
    if (errors.length === 0) return;
    throw new Error(errors.map(this.formatError).join('\n'));
  }

  formatError(error) {
    return `${error.loc}: ${error.text}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Interpreter};
