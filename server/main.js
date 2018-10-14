/////////////////////////////////////////////////////////////////

const device = process.argv[2] || '../src/devices/cleware-switch1';
const {Manager} = require(device);
const selector = process.argv[3] || '../src/physical-traffic-light-selector';
const {SelectorCtor} = require(selector);
const {Commander} = require('../src/commander');

/////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////

let commander = new Commander({
  logger,
  manager: Manager,
  selectorCtor: SelectorCtor});

/////////////////////////////////////////////////////////////////

const http = require('http');
const fs = require('fs');
const port = 9000;

/////////////////////////////////////////////////////////////////

function runCommand(req, res) {
  let commandStr = '';
  req.on('data', data => commandStr += data);
  req.on('end', () => commander.run(commandStr));
  res.statusCode = 202; // accepted
  res.end();
}

function serveFile(filepath, contentType, res) {
  fs.readFile(`./server/public/${filepath}`, (err, data) => {
    if (err) {
      res.statusCode = 500; // server error
      res.end(`Error getting ${filepath}: ${err}`);
    } else {
      res.setHeader('Content-type', contentType);
      res.end(data);
    }
  });
}

/////////////////////////////////////////////////////////////////

http.createServer((req, res) => {

  // whitelist based server
  if (req.method === 'GET') {

    if (req.url === '/' || req.url === '/index.html') return serveFile('index.html', 'text/html', res);
    if (req.url === '/style.css') return serveFile('style.css', 'text/css', res);
    if (req.url === '/main.js') return serveFile('main.js', 'text/javascript', res);

  } else if (req.method === 'POST') {

    if (req.url === '/run') return runCommand(req, res);

  }

  res.statusCode = 404; // not found
  res.end();

}).listen(parseInt(port, 10));

/////////////////////////////////////////////////////////////////

console.log(`Server listening on port ${port}`);

/////////////////////////////////////////////////////////////////
