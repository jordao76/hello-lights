let isString = a => typeof a === 'string';
let isArray = a => Array.isArray(a);

let isLight = a => {
  if (isArray(a)) return a.some(isLight);
  return a === 'red' || a === 'yellow' || a === 'green';
};

let getLight = (a, tl) => {
  if (isArray(a)) return a.map(a => getLight(a, tl));
  return isLight(a) ? tl[a] : a;
};

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
    if (!this.commands[commandName]) {
      return new Error(`Command not found: "${commandName}"`);
    }
    let args = commandArr.slice(1);
    return (tl, ct) => {
      // if there are no lights,
      //   then pass the full traffic light as the 1st parameter
      if (!args.some(isLight)) args.unshift(tl);
      args = args.map(a => getLight(a, tl));
      return this.commands[commandName](...args, ct);
    };
  }

  execute(commandStr, tl, ct) {
    var command = this.parse(commandStr);
    if (command instanceof Error) {
      return command;
    }
    try {
      return command(tl, ct);
    } catch(e) {
      return e;
    }
  }

}

module.exports = CommandParser;
