let c = require('../src/commands');
let CommandParser = require('../src/command-parser');
let options =
  require('./options')[process.argv[2] || 'USBswitchCmdOptions'];
let {TrafficLight} = require('../src/traffic-light');
let {resolveConnectedTrafficLight} =
  require('../src/devices/'+options.type)(options);

///////////////

let log = console.log;
let write = (...args) => process.stdout.write(...args);

function error(error) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  let red = "\x1b[31m";
  let reset = "\x1b[0m";
  console.error(`${red}${error}${reset}`);
}

///////////////

// 🚦
let tl;
async function resolveTrafficLight() {
  if (tl && tl.device.isConnected) return tl;
  if (tl = await resolveConnectedTrafficLight()) {
    log('Using traffic light', tl.device.serialNum);
    if (!tl.device.__listening_for_disconnected) {
      tl.device.__listening_for_disconnected = true;
      tl.device.onDisconnected(() => {
        error('Traffic light disconnected!');
      });
    }
    else {
      error('DEBUG: attempt to listen more than once!');
    }
  }
  else {
    error('No traffic light found');
  }
  return tl;
}

let cp = new CommandParser(c.published);
async function execute(str, shouldCancel=true) {
  let tl = await resolveTrafficLight();
  if (tl) {
    if (shouldCancel) c.cancel();
    log(`Executing command '${str}'`);
    var res = cp.execute(str, tl); // no await
    if (res instanceof Error) error(`Error in command '${str}'\n${res}`);
  }
}

///////////////

function prompt() {
  write(' > ');
}

function listen() {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (text) => {
    text = text.trim();
    let match;
    if (!text);
    else if (text === 'cancel') {
      c.cancel();
      log('Cancelled current command');
    }
    else if (text === 'help') {
      help();
    }
    else if (match = text.match(/^help\s+(\w+)/)) {
      help(match[1]);
    }
    else if (text === 'exit' || text === 'quit') {
      c.cancel();
      log('Bye');
      process.exit(0);
    }
    else if (text === 'check device') {
      await resolveConnectedTrafficLight();
      if (tl && tl.device.isConnected) {
        log('Using traffic light', tl.device.serialNum);
      }
      else {
        await resolveTrafficLight();
      }
    }
    else {
      await execute(text);
    }
    prompt();
  });
}

function help(commandName) {
  if (commandName === undefined) {
    var commandList = cp.commandList.map(c=>`    ${c}`);
    console.log([
      `Commands for the traffic light`,
      `> help`,
      `> help [command name]`,
      `> [command]`,
      `> cancel`,
      `> check device`,
      `> exit | quit`,
      `  available commands:`,
      ...commandList
    ].join('\n'));
  }
  else {
    var command = cp.commands[commandName];
    if (command === undefined) {
      help();
      return;
    }
    console.log([
      `${command.name}: ${command.desc}`,
      `  usage: ${command.usage}`,
      `  sample: ${command.eg}`
    ].join('\n'));
  }
}

async function main() {
  help();
  await resolveTrafficLight();
  listen();
  prompt();
}

///////////////

main();
