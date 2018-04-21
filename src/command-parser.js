let baseCommands = require('./base-commands');
let {Cancellable} = require('./cancellable');
let parser = require('./command-peg-parser');

//////////////////////////////////////////////////////////////////////////////

/** Parses and executes commands on a traffic light. */
class CommandParser {

  /**
   * @param {object} [commands] - Commands this parser recognizes.
   */
  constructor(commands = baseCommands) {
    // clone base commands
    this.commands = commands === baseCommands ? {...commands} : commands;
    this.ct = new Cancellable;
  }

  /**
   * Command names this parser recognizes.
   * @type {string[]}
   */
  get commandList() {
    return Object.keys(this.commands);
  }

  /**
   * Cancels any executing commands.
   * @param {Cancellable} [ct] - Cancellation token.
   */
  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable;
    }
  }

  /**
   * Executes a command.
   * @param {string} commandStr - Command string to execute.
   * @param {TrafficLight} tl - Traffic light to use.
   * @param {Cancellable} [ct] - Cancellation token.
   * @param {object} [scope] - Scope for variables in the command.
   */
  async execute(commandStr, tl, ct = this.ct, scope = {}) {
    if (ct.isCancelled) return;
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let res;
    for (let i = 0; i < asts.length; ++i) {
      let command = generator.execute(asts[i]);
      res = await command({tl, ct, scope});
    }
    return res; // returns the last execution result
  }

  /**
   * Parses a command string.
   * @package
   * @param {string} commandStr - Command string to execute.
   * @returns {(function|function[])} One or many traffic light commands.
   */
  parse(commandStr) {
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let commands = asts.map(ast => generator.execute(ast));
    if (commands.length === 1) return commands[0];
    return commands;
  }

  /**
   * Defines a new command.
   * @param {string} name - Command name.
   * @param {function} command - A traffic light command.
   * @param {string} [desc] - Command description.
   * @returns {function} The newly defined command.
   */
  define(name, command, desc = '') {
    if (this.commands[name]) throw new Error(`Command "${name}" already exists`);
    let paramNames = command.paramNames || [];
    let newCommand = ({tl, ct, scope = {}}, params = []) => {
      Validator.validate(newCommand, params);
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({tl, ct, scope});
    };
    newCommand.doc = {name, desc};
    newCommand.paramNames = paramNames;
    return this.commands[name] = newCommand;
  }

}

//////////////////////////////////////////////////////////////////////////////

let isVar = (a) => typeof a === 'string' && a.startsWith(':');
let getName = (v) => v.replace(/^:/, '');

class Vars {
  constructor(args) {
    this.args = args;
  }
  resolve(scope) {
    return this.args.map(a =>
      isVar(a) ? scope[getName(a)] : a
    );
  }
}

//////////////////////////////////////////////////////////////////////////////

class Generator {

  constructor(parser) {
    this.parser = parser;
    this.commands = parser.commands;
  }

  execute(ast) {
    this.variables = [];
    this.errors = [];
    let res = this.recur(ast);
    Validator.raiseIf(this.errors);
    return res;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // get the command components: its name and its arguments
    let commandName = node.name;
    let args = node.params;

    // collect errors
    let errors;

    // recurse on parameters
    args = args.map(a => this.recur(a));

    // get the command
    let command = this.commands[commandName];
    if (command) {
      // transform the command arguments
      args = this._transform(command, args);

      // validate the command arguments
      errors = Validator.collect(command, args);
    } else {
      // invalid command
      errors = [`Command not found: "${commandName}"`];
    }

    // check for errors
    if (errors.length > 0) {
      this.errors.push(...errors);
      return;
    }

    // return a command that takes (in an object) a traffic light (tl),
    // a cancellation token (ct) and an optional scope with variable bindings
    let vars = new Vars(args);
    let res = ({tl, ct, scope={}}) => {
      let ctx = {tl, ct, scope};
      if (command.usesParser) ctx.cp = this.parser; // cp = command-parser
      let params = vars.resolve(scope);
      Validator.validate(command, params);
      return command(ctx, params);
    };
    // note: these are ALL the variables collected so far,
    // not only the ones relevant for this command
    // e.g. (run (toggle :l1) (pause :ms) (toggle :l2))
    //   'pause' will have [l1, ms]
    //   the second 'toggle' will have [l1, ms, l2]
    res.paramNames = this.variables; // variables become parameter names
    return res;
  }

  variable(node) {
    if (this.variables.indexOf(node.name) < 0) {
      this.variables.push(node.name);
    }
    return ':' + node.name;
  }

  value(node) {
    return node.value;
  }

  _transform(command, args) {
    if (command.transformation) {
      return command.transformation(args);
    }
    return args;
  }

};

//////////////////////////////////////////////////////////////////////////////

let Validator = {

  validate(command, args) {
    let errors = this.collect(command, args);
    this.raiseIf(errors);
  },

  raiseIf(errors) {
    if (errors.length > 0) throw new Error(errors.join('\n'));
  },

  collect(command, args) {
    let badArity = (exp, act) =>
      `Bad number of arguments to "${commandName}"; it takes ${exp} but was given ${act}`;
    let badValue = (i) => {
      if (args[i] === undefined) return null;
      return `Bad value "${args[i]}" to "${commandName}" parameter ${i+1} ("${pns[i]}"); must be: ${vfs[i].exp}`;
    };

    let commandName = command.doc ? command.doc.name : command.name;
    let pns = command.paramNames; // pns = Parameter NameS
    let es = []; // es = ErrorS

    if (pns.length !== args.length) {
      es.push(badArity(pns.length, args.length));
    }

    let vfs = command.validation || []; // vfs = Validation FunctionS
    let argsErrors = vfs
      .map((isValid, i) => args.length <= i || isVar(args[i]) || isValid(args[i]) ? null : badValue(i))
      .filter(e => e); // filter out 'null', where the validation was successful
    es.push(...argsErrors);
    return es;
  }

};

module.exports = {CommandParser};
