// 🚦

let device = process.argv[2] || '../src/devices/cleware-switch1';
let {Manager} = require(device);
let {Commander} = require('../src/commander');

///////////////

let blue = '\x1b[34m';
let red = '\x1b[31m';
let reset = '\x1b[0m';
let logger = {
  log: (...args) => {
    console.log(blue, ...args, reset);
    prompt();
  },
  error: (...args) => {
    console.error(red, ...args, reset);
    prompt();
  }
};

///////////////

let commander = new Commander({logger, manager: Manager});

///////////////

let log = console.log;
let write = (...args) => process.stdout.write(...args);

///////////////

function prompt() {
  write(' > ');
}

///////////////

function listen() {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (text) => {
    text = text.trim();
    let match;
    if (!text) {
      prompt();
    } else if (text === 'cancel') {
      commander.cancel();
      prompt();
    } else if (text === 'help') {
      help();
    } else if (match = text.match(/^help\s+(.+)/)) { // eslint-disable-line no-cond-assign
      help(match[1]);
    } else if (text === 'exit' || text === 'quit') {
      commander.cancel();
      commander.close();
      log('Bye');
      process.exit(0);
    } else if (text === 'check device') {
      commander.logDevicesInfo();
    } else {
      commander.run(text);
      prompt();
    }
  });
}

///////////////

function help(commandName) {
  if (commandName === undefined) {
    var commandList = commander.commands().map(c => `    ${c}`);
    log([
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
    prompt();
  } else {
    commander.help(commandName);
  }
}

///////////////

function main() {
  help();
  listen();
}

///////////////

main();
