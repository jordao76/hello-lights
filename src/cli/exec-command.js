/////////////////////////////////////////////////////////////////

const commanderOptions = require('./commander-options');

/////////////////////////////////////////////////////////////////

async function exec(options, cmd, cdr = []) {
  let commander = commanderOptions.resolveCommander(options);
  cdr.unshift(cmd);
  let command = cdr.join(' ');
  await commander.run(command);
  commander.close();
}

/////////////////////////////////////////////////////////////////

const commandSpec = {

  command: 'exec <cmd>',
  describe: 'executes a command',

  builder: yargs =>
    yargs.positional('cmd', { describe: 'command to execute' }),

  handler: argv =>
    exec(argv, argv.cmd, argv._.slice(1)) // argv._ includes 'exec' at index 0

};

/////////////////////////////////////////////////////////////////

function define(yargs) {
  yargs
    .command(commandSpec)
    .example('$0 exec bounce 300', '# executes the `bounce 300` command');
};

/////////////////////////////////////////////////////////////////

module.exports = {define};

/////////////////////////////////////////////////////////////////
