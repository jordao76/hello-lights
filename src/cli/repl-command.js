/////////////////////////////////////////////////////////////////

const repl = require('repl');

/////////////////////////////////////////////////////////////////

class CommanderRepl {

  constructor(commander) {
    this.commander = commander;
    this.multiline = false;
    this.logger = this.commander.logger;
    this.manager = this.commander.manager;
  }

  async formatCommandNames() {
    let names = await this.commander.fetchCommandNames();
    let parts = ['  '];
    names.forEach((name, i) => {
      parts.push(`  ${name}`);
      if ((i + 1) % 8 === 0) parts.push('\n  ');
    });
    return parts.join('');
  }

  async help(commandName) {
    if (commandName === undefined) {
      this.logger.log([
        `Commands for the traffic light`,
        `> help`,
        `> help [command name]`,
        `> check device` + (this.supportsNewDevice() ? '\n> new device' : ''),
        `> exit | quit`,
        `> [command]`,
        `> { [... multi line command] }`,
        `  available commands:`,
        await this.formatCommandNames()
      ].join('\n'));
    } else {
      await this.commander.help(commandName);
    }
  }

  async execute(text, context, filename, callback) {
    text = text.trim();
    let match;
    if (!text) {
    } else if (text === 'cancel') {
      await this.commander.cancel();
    } else if (text === 'help') {
      await this.help();
    } else if (match = text.match(/^help\s+(.+)/)) { // eslint-disable-line no-cond-assign
      await this.help(match[1]);
    } else if (text === 'exit' || text === 'quit') {
      await this.commander.cancel();
      this.commander.close();
      this.logger.log('Bye');
      process.exit(0);
    } else if (text === 'check device') {
      await this.commander.logInfo();
    } else if (this.supportsNewDevice() && text === 'new device') {
      this.newDevice();
    } else if (text.startsWith('{')) {
      this.multiline = true;
      return this.execute(text.replace('{', ''), context, filename, callback);
    } else if (this.multiline && text.endsWith('}')) {
      this.multiline = false;
      this.commander.run(text.replace('}', ''));
    } else if (this.multiline) {
      return callback(new repl.Recoverable());
    } else {
      this.commander.run(text);
    }
    return callback();
  }

  launch() {
    this.help();
    let server = repl.start({
      prompt: '> ',
      eval: (...args) => this.execute(...args)
    });
    server.on('exit', () => process.exit(0));
  }

  supportsNewDevice() {
    return !!this.manager.newDevice;
  }
  newDevice() {
    this.manager.newDevice();
  }

}

/////////////////////////////////////////////////////////////////

const commanderOptions = require('./commander-options');

/////////////////////////////////////////////////////////////////

function main(options) {
  let commander = commanderOptions.resolveCommander(options);
  let commanderRepl = new CommanderRepl(commander);
  commanderRepl.launch();
}

/////////////////////////////////////////////////////////////////

const commandSpec = {
  command: 'repl',
  describe: 'starts the REPL',
  handler: main
};

/////////////////////////////////////////////////////////////////

function define(yargs) {
  yargs
    .command(commandSpec)
    .example('$0 repl', '# starts a REPL');
};

/////////////////////////////////////////////////////////////////

module.exports = {define, CommanderRepl};

/////////////////////////////////////////////////////////////////
