/////////////////////////////////////////////////////////////////

const commanderOptions = require('./commander-options');

/////////////////////////////////////////////////////////////////

async function execFile(options, filePath) {
  let commander = commanderOptions.resolveCommander(options);
  await commander.runFile(filePath);
  commander.close();
}

/////////////////////////////////////////////////////////////////

const commandSpec = {

  command: 'exec-file <file-path>',
  describe: 'executes commands in a file',

  builder: yargs =>
    yargs.positional('file-path', { describe: 'file to execute' }),

  handler: argv =>
    execFile(argv, argv.filePath)

};

/////////////////////////////////////////////////////////////////

function define(yargs) {
  yargs
    .command(commandSpec)
    .example('$0 exec-file ./my-file.clj', '# executes the file');
};

/////////////////////////////////////////////////////////////////

module.exports = {define};

/////////////////////////////////////////////////////////////////
