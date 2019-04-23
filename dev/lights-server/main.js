/////////////////////////////////////////////////////////////////

let {commander} = require('commander-cli');

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

    if (req.url === '/direct' || req.url === '/direct/index.html') return serveFile('direct/index.html', 'text/html', res);
    if (req.url === '/direct/style.css') return serveFile('direct/style.css', 'text/css', res);

  } else if (req.method === 'POST') {

    if (req.url === '/run') return runCommand(req, res);

  }

  res.statusCode = 404; // not found
  res.end();

}).listen(port);

/////////////////////////////////////////////////////////////////

console.log(`Server listening on port ${port}`);

/////////////////////////////////////////////////////////////////
