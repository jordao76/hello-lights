class CommandParser {

  constructor(commands) {
    this.commands = commands;
    this.commandList = Object.keys(commands);
  }

  parse(commandStr) {
    let commandJSON =
      '['+commandStr.trim()
      .replace(/([a-z_]\w*)/ig,'"$1"')
      .replace(/\s+/g,',')
      .replace(/\(/g,'[').replace(/\)/g,']')
      +']';
    let commandArr = JSON.parse(commandJSON);
    let commandName = commandArr[0];
    let command = this.commands[commandName]
    if (!command) {
      return new Error(`Command not found: "${commandName}"`);
    }
    let args = commandArr.slice(1);
    return (tl, ct) => command(tl, ...args, ct);
  }

  execute(commandStr, tl, ct) {
    var command = this.parse(commandStr);
    if (command instanceof Error) return command;
    try {
      return command(tl, ct);
    } catch(e) {
      return e;
    }
  }

}

module.exports = CommandParser;
