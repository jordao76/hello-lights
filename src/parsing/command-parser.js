const baseCommands = require('./base-commands');
const {Cancellable} = require('./cancellable');
const parser = require('./command-peg-parser');

//////////////////////////////////////////////////////////////////////////////

/**
 * A function that implements a command.
 * @typedef {function} CommandFunction
 * @memberof parsing
 * @param {object} ctx - Context to execute the command.
 * @param {parsing.Cancellable} ctx.ct - A cancellation token.
 * @param {object} ctx.scope - Variable bindings for nested commands.
 * @param {...object} [ctx....] - Extra context objects needed for the command,
 *   like the objects that the command manipulates.
 * @param {object[]} [params] - The command parameters.
 * @property {object} doc - Name and description of the command.
 * @property {string} doc.name - Command name.
 * @property {string} doc.desc - Command description.
 * @property {function} [transformation] - Transforms the parameters of the command.
 * @property {string[]} [paramNames] - Parameter names for the command.
 * @property {function[]} [validation] - Validation functions for each parameter
 *   after transformation.
 */

//////////////////////////////////////////////////////////////////////////////

/**
 * Parses and executes commands.
 * @memberof parsing
 */
class CommandParser {

  /**
   * @param {object.<string, parsing.CommandFunction>} [commands] -
   *   Base commands this parser recognizes.
   */
  constructor(commands = baseCommands) {
    if (commands === baseCommands) {
      // clone base-commands so it's not changed if new commands are added
      this.commands = {...commands};
    } else {
      this.commands = commands;
    }
    this._addDefine();
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
   * @param {parsing.Cancellable} [ct] - Cancellation token.
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
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands context, togeher with the cancellation token and the scope.
   *   This context cannot have keys 'ct' and 'scope', since they would be
   *   overwritten anyway.
   * @param {parsing.Cancellable} [ct] - Cancellation token.
   * @param {object} [scope] - Scope for variables in the command.
   */
  async execute(commandStr, ctx = {}, ct = this.ct, scope = {}) {
    if (ct.isCancelled) return;
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let res;
    for (let i = 0; i < asts.length; ++i) {
      let command = generator.execute(asts[i]);
      res = await command({...ctx, ct, scope});
    }
    if (ct === this.ct && ct.isCancelled) {
      // the command 'cancel' was executed on this.ct, so re-instantiate it
      this.ct = new Cancellable;
    }
    return res; // returns the last execution result
  }

  /**
   * Parses a command string.
   * @package
   * @param {string} commandStr - Command string to execute.
   * @returns {(parsing.CommandFunction|parsing.CommandFunction[])}
   *   One or many command functions.
   */
  parse(commandStr) {
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let commands = asts.map(ast => generator.execute(ast));
    if (commands.length === 1) return commands[0];
    return commands;
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {parsing.CommandFunction} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
  }

  // Defines a new command or redefines an existing one.
  // Used by the 'define' command.
  _define(name, command, desc = '') {
    let paramNames = command.paramNames || [];
    let newCommand = (ctx, params = []) => {
      let {scope = {}} = ctx;
      Validator.validate(newCommand, params);
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({...ctx, scope});
    };
    newCommand.doc = {name, desc};
    newCommand.paramNames = paramNames;
    newCommand.toString = () => `'${name}' command`;
    return this.commands[name] = newCommand;
  }

  _addDefine() {
    // add the 'define' command, which is intrinsic to the CommandParser
    const {isIdentifier, isString, isCommand} = require('./validation');
    let define = (ctx, [name, desc, command]) => this._define(name, command, desc);
    define.doc = {
      name: 'define',
      desc: 'Defines a new command or redefines an existing one, where variables become parameters:\n' +
            '(define burst\n  "Burst of light: (burst red)"\n  (twinkle :light 70))\n\n(burst red)'
    };
    define.paramNames = ['name', 'desc', 'command'];
    define.validation = [isIdentifier, isString, isCommand];
    this.add('define', define);
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

    // return a command that takes a context including an
    // optional scope with variable bindings
    let vars = new Vars(args);
    let res = (ctx) => {
      let {scope = {}} = ctx;
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
    res.toString = () => `'${commandName}' command`;
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

//////////////////////////////////////////////////////////////////////////////

module.exports = {CommandParser};
