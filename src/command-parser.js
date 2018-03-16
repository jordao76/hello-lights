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

  define(name, commandStr, paramNames = []) {
    if (this.commands[name]) throw new Error(`Command "${name}" already exists`);
    let c = this.parse(commandStr);
    let command = ({tl, ct, scope = {}}, params = []) => {
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return c({tl, ct, scope});
    }
    return this.commands[name] = command;
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
    return this._interpret(commandAst);
  }

  _interpret(node) {
    return interpreter[node.type].call(this, node);
  }

  _validate(command, args) {
    // vfs = Validation FunctionS
    let vfs = command.validation;
    // a command with no validation is always valid
    if (!vfs) return true;
    // the number of arguments must match the number of validation functions
    if (vfs.length !== args.length) return false;
    // run the validation functions against the arguments
    let vs = vfs.map((isValid, i) => isValid(args[i]));
    // return true if all are valid
    return vs.every(v => v);
  }

  _transform(command, args) {
    if (command.transformation) {
      return command.transformation(args);
    }
    return args;
  }

}

//////////////////////////////////////////////////////////////////////////////

let interpreter = {

  command(node) {
    // get the command components: its name and its arguments
    let commandName = node.name;
    let args = node.params;

    // get the command and check that it's valid
    let command = this.commands[commandName];
    if (!command) throw new Error(`Command not found: "${commandName}"`);

    // interpret parameters
    args = args.map(a => this._interpret(a));

    // transform the command arguments
    args = this._transform(command, args);

    // validate the command arguments
    if (!this._validate(command, args))
      throw new Error(`Check your arguments: ${command.doc.usage}`);

    // return a command that takes a traffic light (tl),
    // a cancellation token (ct) and an optional scope with variable bindings
    let vars = new Vars(args);
    let res = command.usesParser?
      ({tl, ct, scope={}}) => command({cp:this, tl, ct, scope}, vars.resolve(scope)):
      ({tl, ct, scope={}}) => command({tl, ct, scope}, vars.resolve(scope));
    return res;
  },

  variable(node) {
    return ':' + node.name;
  },

  value(node) {
    return node.value;
  }

};

//////////////////////////////////////////////////////////////////////////////

module.exports = {CommandParser};
