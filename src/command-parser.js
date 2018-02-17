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
  }

  parse(commandStr) {
    let commandJSON =
      '['+commandStr.trim()
      .replace(/([a-z_]\w*)/ig,'"$1"')
      .replace(/\s+/g,',')
      .replace(/\(/g,'[').replace(/\)/g,']')
      +']';
    let commandArr = JSON.parse(commandJSON);
    let command = commandArr[0];
    let args = commandArr.slice(1);
    return (tl, ct) => {
      // if there are no lights,
      //   then pass the full traffic light as the 1st parameter
      if (!args.some(isLight)) args.unshift(tl);
      args = args.map(a => getLight(a, tl));
      return this.commands[command](...args, ct);
    };
  }
}

module.exports = CommandParser;
