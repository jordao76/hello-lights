/////////////////////////////////////////////////////////////////

const EventEmitter = require('events');
const chalk = require('chalk');
const {Commander} = require('hello-lights');
const {Manager} = require('hello-lights/lib/devices/cleware-switch1');

const commander = Commander.single({
  logger: {
    log: (...args) => console.log(chalk.cyan(...args)),
    error: (...args) => console.error(chalk.yellow(...args))
  },
  manager: Manager
});

/////////////////////////////////////////////////////////////////

// an event emitter logger
class CommanderLogger extends EventEmitter {
  log(...args) {
    console.log(chalk.cyan(...args));
    this.emit('log', ...args);
  }
  error(...args) {
    console.error(chalk.yellow(...args));
    this.emit('log_error', ...args);
  }
}

/////////////////////////////////////////////////////////////////

const logger = new CommanderLogger();
commander.logger = logger; // change the command logger

/////////////////////////////////////////////////////////////////

function runCommand(req, res) {
  let commandStr = '';
  req.on('data', data => commandStr += data);
  req.on('end', () => {
    commander.run(commandStr);
    res.statusCode = 202; // accepted
    res.end();
  });
}

/////////////////////////////////////////////////////////////////

const path = require('path');
const port = process.env.PORT || 9000;
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

/////////////////////////////////////////////////////////////////

logger.on('log', (...args) => io.emit('log', ...args));
logger.on('log_error', (...args) => io.emit('log_error', ...args));

/////////////////////////////////////////////////////////////////

app.use(express.static(path.join(__dirname, 'public')));
app.post('/run', runCommand);

/////////////////////////////////////////////////////////////////

http.listen(port, () => console.log(`Server listening on port ${port}`));

/////////////////////////////////////////////////////////////////
