/////////////////////////////////////////////////////////////////

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
  selectorCtor: SelectorCtor
});

/////////////////////////////////////////////////////////////////

const http = require('http');
const fs = require('fs');
const port = process.env.PORT || 9000;

/////////////////////////////////////////////////////////////////

function runCommand(req, res) {
  let commandStr = '';
  req.on('data', data => commandStr += data);
  req.on('end', () => commander.run(commandStr));
  res.statusCode = 202; // accepted
  res.end();
}

function serveFile(filepath, contentType, res) {
  fs.readFile(`${__dirname}/public/${filepath}`, (err, data) => {
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

}).listen(port);

/////////////////////////////////////////////////////////////////

console.log(`Server listening on port ${port}`);

/////////////////////////////////////////////////////////////////
