/////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
const util = require('util');
if (util.promisify) fs.readFileAsync = util.promisify(fs.readFile);

/////////////////////////////////////////////////////////////////////////////

const {Parser} = require('./parser');
const {Analyzer} = require('./analyzer');
const {Generator} = require('./generator');
const {Cancellable} = require('./cancellable');

/////////////////////////////////////////////////////////////////////////////

const define = require('./define');
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
    this.commands = {};
    if (intrinsics) {
      Object.assign(this.commands, {
        ...define.commands, // add the 'define' commands
        ...baseCommands.commands // add the base commands
      });
    }
    Object.assign(this.commands, commands);
    this.parser = new Parser();
    this.analyzer = new Analyzer(this.commands);
    this.generator = new Generator();
    this.ct = new Cancellable();
  }

  /**
   * Command names this interpreter recognizes.
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this.commands);
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name. Should be the same as the command.meta.name property.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
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
