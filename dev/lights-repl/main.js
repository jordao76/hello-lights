///////////////

let {commander, Manager} = require('commander-cli');

///////////////

const repl = require('repl');

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

function formatCommandNames(names) {
  var parts = ['  '];
  names.forEach((name, i) => {
    parts.push(`  ${name}`);
    if ((i + 1) % 8 === 0) parts.push('\n  ');
  });
  return parts.join('');
}

function help(commandName) {
  if (commandName === undefined) {
    console.log([
      `Commands for the traffic light`,
      `> help`,
      `> help [command name]`,
      `> check device` + (Manager.newDevice ? '\n> new device' : ''),
      `> exit | quit`,
      `> [command]`,
      `> { [... multi line command] }`,
      `  available commands:`,
      formatCommandNames(commander.commandNames)
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
