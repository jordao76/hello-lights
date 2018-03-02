let c = require('./commands');
let {Cancellable} = require('./cancellable');

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
    let [commandName, args] = this._parse(commandStr);
    let command = this.commands[commandName];
    if (!command) {
      return new Error(`Command not found: "${commandName}"`);
    }
    if (!this._validate(command, args)) {
      return new Error(`Check your arguments: ${command.doc.usage}`);
    }
    return (tl, ct) => command(tl, ...args, ct);
  }

  _parse(commandStr) {
    let commandJSON =
      '['+commandStr.trim()
      .replace(/([a-z_]\w*)/ig,'"$1"')
      .replace(/\s+/g,',')
      .replace(/\(/g,'[').replace(/\)/g,']')
      +']';
    let commandArr = JSON.parse(commandJSON);
    let commandName = commandArr[0];
    let args = commandArr.slice(1);
    return [commandName, args];
  }

  _validate(command, args) {
    let vfs = command.validation; // vfs = Validation FunctionS
    if (!vfs) return true;
    if (vfs.length !== args.length) return false;
    let vs = vfs.map((isValid, i) => isValid(args[i]));
    return vs.every(v => v);
  }

}

module.exports = {CommandParser};
