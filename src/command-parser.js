let isString = a => typeof a === 'string';

class CommandParser {
  constructor(commands) {
    this.commands = commands;
  }
  parse(commandStr) {
    let commandJSON =
      '['+commandStr.trim()
      .replace(/([a-z_]\w*)/ig,'"$1"')
      .replace(/\s+/g,',')+']';
    let commandArr = JSON.parse(commandJSON);
    let command = commandArr[0];
    let args = commandArr.slice(1);
    return (tl, ct) => {
      // having a string means that it accesses lights
      // not having a string means it needs the full traffic light
      if (!args.some(isString)) args.unshift(tl);
      args = args.map(a => isString(a) ? tl[a] : a);
      return this.commands[command](...args, ct);
    };
  }
}

module.exports = CommandParser;
