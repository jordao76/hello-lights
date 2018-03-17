let {published} = require('./commands');
let {Cancellable} = require('./cancellable');
let parser = require('./command-peg-parser');

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

class CommandParser {

  constructor(commands = published) {
    this.commands = commands;
    this.ct = new Cancellable;
  }

  get commandList() {
    return Object.keys(this.commands);
  }

  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable;
    }
  }

  execute(commandStr, tl, ct = this.ct) {
    if (ct.isCancelled) return;
    var command = this.parse(commandStr);
    return command({tl, ct}); // no await
  }

  parse(commandStr) {
    let commandAst = parser.parse(commandStr);
    let interpreter = new Interpreter(this);
    return interpreter.interpret(commandAst);
  }

  define(name, command) {
    if (this.commands[name]) throw new Error(`Command "${name}" already exists`);
    let paramNames = command.paramNames || [];
    return this.commands[name] = ({tl, ct, scope = {}}, params = []) => {
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({tl, ct, scope});
    }
  }

}

//////////////////////////////////////////////////////////////////////////////

class Interpreter {

  constructor(parser) {
    this.parser = parser;
    this.commands = parser.commands;
    this.variables = [];
  }

  interpret(ast) {
    let res = this.recur(ast);
    res.paramNames = this.variables; // variables become parameter names
    return res;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // get the command components: its name and its arguments
    let commandName = node.name;
    let args = node.params;

    // get the command and check that it's valid
    let command = this.commands[commandName];
    if (!command) throw new Error(`Command not found: "${commandName}"`);

    // recurse on parameters
    args = args.map(a => this.recur(a));

    // transform the command arguments
    args = this._transform(command, args);

    // validate the command arguments
    this._validate(command, args);

    // return a command that takes (in an object) a traffic light (tl),
    // a cancellation token (ct) and an optional scope with variable bindings
    let vars = new Vars(args);
    return ({tl, ct, scope={}}) => {
      let ctx = {tl, ct, scope};
      if (command.usesParser) ctx.cp = this.parser; // cp = command-parser
      let params = vars.resolve(scope);
      this._validate(command, params);
      return command(ctx, params);
    }
  }

  variable(node) {
    this.variables.push(node.name);
    return ':' + node.name;
  }

  value(node) {
    return node.value;
  }

  _validate(command, args) {
    if (!this._isValid(command, args))
      throw new Error(`Check your arguments: ${command.doc.usage}`);
  }

  _isValid(command, args) {
    // vfs = Validation FunctionS
    let vfs = command.validation;
    // a command with no validation is always valid
    if (!vfs) return true;
    // the number of arguments must match the number of validation functions
    if (vfs.length !== args.length) return false;
    // run the validation functions against the arguments
    // don't validate variables
    let vs = vfs.map((isValid, i) => isVar(args[i]) || isValid(args[i]));
    // return true if all are valid
    return vs.every(v => v);
  }

  _transform(command, args) {
    if (command.transformation) {
      return command.transformation(args);
    }
    return args;
  }

};

//////////////////////////////////////////////////////////////////////////////

module.exports = {CommandParser};
