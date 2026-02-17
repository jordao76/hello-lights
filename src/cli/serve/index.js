/////////////////////////////////////////////////////////////////

const path = require('path');
const chalk = require('chalk');
const commanderOptions = require('../commander-options');

/////////////////////////////////////////////////////////////////

const now = () => chalk.gray(`[${new Date().toISOString()}]`);

const logger = {
  log: (...args) =>
    console.log(now(), '[INFO]', ...args),
  error: (...args) =>
    console.error(now(), chalk.red('[ERROR]'), chalk.red(...args))
};

/////////////////////////////////////////////////////////////////

function createApp(commander, {logger: log = logger} = {}) {
  const express = require('express');
  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.text({type: '*/*'}));

  app.post('/run', (req, res) => {
    let body = req.body || '';
    log.log('POST /run:', body);
    try {
      commander.interpreter.process(body);
    } catch (e) {
      log.error('POST /run: malformed:', e.message);
      res.status(400).send(e.message);
      return;
    }
    let reset = req.query.reset === 'true';
    commander.run(body, reset);
    res.sendStatus(202);
  });

  app.post('/cancel', async (req, res) => {
    await commander.cancel();
    res.sendStatus(200);
  });

  app.post('/definitions', (req, res) => {
    let body = req.body || '';
    log.log('POST /definitions:', body);
    try {
      commander.interpreter.process(body);
    } catch (e) {
      log.error('POST /definitions: malformed:', e.message);
      res.status(400).send(e.message);
      return;
    }
    commander.runDefinitions(body);
    res.sendStatus(202);
  });

  app.get('/commands', async (req, res) => {
    res.json(await commander.fetchCommandNames());
  });

  app.get('/commands/:name', (req, res) => {
    let command = commander.interpreter.lookup(req.params.name);
    if (!command) {
      res.status(404).send(`Command not found: "${req.params.name}"`);
      return;
    }
    let helpText = commander.formatter.format(command.meta);
    res.type('text/x-ansi').send(helpText);
  });

  app.get('/info', (req, res) => {
    if (commander.manager) {
      res.json(commander.manager.info());
    } else {
      res.json([]);
    }
  });

  return app;
}

function serve(options) {
  const commander = commanderOptions.resolveCommander(options);
  const app = createApp(commander);
  const server = app.listen(options.port, () => logger.log(`Server listening on port ${options.port}`));
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`port ${options.port} is already in use`);
    } else {
      logger.error(err.message);
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
