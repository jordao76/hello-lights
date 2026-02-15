/////////////////////////////////////////////////////////////////

const path = require('path');
const commanderOptions = require('../commander-options');

/////////////////////////////////////////////////////////////////

function createApp(commander) {
  const express = require('express');
  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));
  app.post('/run', (req, res) => {
    let commandStr = '';
    req.on('data', data => commandStr += data);
    req.on('end', () => {
      commander.run(commandStr);
      res.statusCode = 202; // accepted
      res.end();
    });
  });

  return app;
}

function serve(options) {
  const commander = commanderOptions.resolveCommander(options);
  const app = createApp(commander);
  const server = app.listen(options.port, () => console.log(`Server listening on port ${options.port}`));
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: port ${options.port} is already in use`);
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  });
}

/////////////////////////////////////////////////////////////////

const commandSpec = {

  command: 'serve',
  describe: 'starts the HTTP server for remote light control',

  builder: yargs =>
    yargs.option('port', {
      alias: 'P',
      describe: 'port to listen on',
      default: 9000,
      type: 'number'
    }),

  handler: argv => serve(argv)

};

/////////////////////////////////////////////////////////////////

function define(yargs) {
  yargs
    .command(commandSpec)
    .example('$0 serve', '# starts the server on port 9000')
    .example('$0 serve --port 3000', '# starts the server on port 3000');
}

/////////////////////////////////////////////////////////////////

module.exports = {define, createApp};

/////////////////////////////////////////////////////////////////
