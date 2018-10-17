///////////////

const repl = require('repl');

///////////////

// Two possibilities for `device`: cleware (default) or chromium (or anything else really)
const deviceName = process.argv[2] || 'cleware';
const devicePath =
  deviceName === 'cleware'
    ? 'hello-lights/lib/devices/cleware-switch1'
    : 'chromium-device'; // fallback is chromium
const {Manager} = require(devicePath);

const {Commander} = require('hello-lights');

// Two possibilities for selector: single (default) or multi (or anything else really)
const selectorName = process.argv[3] || 'single';
const selectorProperty =
  selectorName === 'single'
    ? 'PhysicalTrafficLightSelector'
    : 'PhysicalMultiTrafficLightSelector'; // fallback is multi
const SelectorCtor = require('hello-lights').selectors[selectorProperty];

///////////////

const blue = '\x1b[34m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const logger = {
  log: (...args) => {
    console.log(blue, ...args, reset);
  },
  error: (...args) => {
    console.error(red, ...args, reset);
  }
};

///////////////

let commander = new Commander({
  logger,
  manager: Manager,
  selectorCtor: SelectorCtor
});

///////////////

let multiline = false;
function execute(text, context, filename, callback) {
  text = text.trim();
  let match;
  if (!text) {
  } else if (text === 'cancel') {
    commander.cancel();
  } else if (text === 'help') {
    help();
  } else if (match = text.match(/^help\s+(.+)/)) { // eslint-disable-line no-cond-assign
    help(match[1]);
  } else if (text === 'exit' || text === 'quit') {
    commander.cancel();
    commander.close();
    console.log('Bye');
    process.exit(0);
  } else if (text === 'check device') {
    commander.logInfo();
  } else if (Manager.newDevice && text === 'new device') {
    Manager.newDevice();
  } else if (text.startsWith('{')) {
    multiline = true;
    return execute(text.replace('{', ''), context, filename, callback);
  } else if (multiline && text.endsWith('}')) {
    multiline = false;
    commander.run(text.replace('}', ''));
  } else if (multiline) {
    return callback(new repl.Recoverable());
  } else {
    commander.run(text);
  }
  return callback();
}

///////////////

function help(commandName) {
  if (commandName === undefined) {
    var commandNames = commander.commandNames.map(c => `    ${c}`);
    console.log([
      `Commands for the traffic light`,
      `> help`,
      `> help [command name]`,
      `> cancel`,
      `> check device` + (Manager.newDevice ? '\n> new device' : ''),
      `> exit | quit`,
      `> [command]`,
      `> { [... multi line command] }`,
      `  available commands:`,
      ...commandNames
    ].join('\n'));
  } else {
    commander.help(commandName);
  }
}

///////////////

function main() {
  help();
  let server = repl.start({
    prompt: '> ',
    eval: execute
  });
  server.on('exit', () => process.exit(0));
}

///////////////

main();
