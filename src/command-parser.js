let c = require('./commands');
let {Cancellable} = require('./cancellable');

let isVar = (a) => typeof a === 'string' && a.startsWith(':');
let getName = (v) => v.replace(/^:/, '');

class Vars {

  constructor(args) {
    this.args = args;
  }

  hasVars() {
    return this.args.some(isVar);
  }

  resolve(assignments) {
    return this.args.map(a =>
      isVar(a) ? assignments[getName(a)] : a
    );
  }

}

class CommandParser {

  constructor(commands = c.published) {
    this.commands = commands;
    this.commandList = Object.keys(commands);
    this.ct = new Cancellable;
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
    if (command instanceof Error) return command;
    try {
      return command(tl, ct);
    } catch(e) {
      return e;
    }
  }

  parse(commandStr) {
    // turn the command into a JSON array
    let commandJSON =
      '['+
        commandStr.trim()
          .replace(/(:?[a-z_]\w*)/ig,'"$1"') // surround names and vars with quotes
          .replace(/(\S)?\(\s*/g,'$1 [') // parenthesis turn to arrays
          .replace(/\s*\)/g,']') // end of parenthesis
          .replace(/\s+/g,',') // separate everything with commas
      +']';
    let commandArr = JSON.parse(commandJSON);
    return this._interpret(commandArr);
  }

  _interpret(commandArr) {
    // get the command components: its name and its arguments
    let commandName = commandArr[0];
    let args = commandArr.slice(1);

    // get the command and check that it's valid
    let command = this.commands[commandName];
    if (!command) return new Error(`Command not found: "${commandName}"`);

    // interpret sub-commands and check for nested errors
    args = args.map(a => Array.isArray(a) ? this._interpret(a) : a);
    let errors = args.filter(a => a instanceof Error).map(e => e.message);
    if (errors.length > 0) return new Error(errors.join('\n'));

    // transform the command arguments
    args = this._transform(command, args);

    // validate the command arguments
    if (!this._validate(command, args))
      return new Error(`Check your arguments: ${command.doc.usage}`);

    // variables
    let vars = new Vars(args);

    if (vars.hasVars())
      // return a command that takes a traffic light (tl),
      // a cancellation token (ct) and variable assignments
      return command.usesParser ?
        (tl, ct, assignments) => command(this, tl, ...vars.resolve(assignments), ct) :
        (tl, ct, assignments) => command(tl, ...vars.resolve(assignments), ct);

    // return a command that takes a traffic light (tl) and a cancellation token (ct)
    return command.usesParser ?
      (tl, ct) => command(this, tl, ...args, ct) :
      (tl, ct) => command(tl, ...args, ct);
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

module.exports = {CommandParser};
