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

const urls = {

  '/': { file: 'index.html', type: 'text/html' },
  '/index.html': { file: 'index.html', type: 'text/html' },
  '/style.css': { file: 'style.css', type: 'text/css' },
  '/main.js': { file: 'main.js', type: 'text/javascript' },

  '/direct': { file: 'direct/index.html', type: 'text/html' },
  '/direct/index.html': { file: 'direct/index.html', type: 'text/html' },
  '/direct/style.css': { file: 'direct/style.css', type: 'text/css' },
  // iOS icons
  '/direct/traffic-light-appstore.png': { file: 'direct/traffic-light-appstore.png', type: 'image/png' },
  '/direct/traffic-light-ipad-ipadmini.png': { file: 'direct/traffic-light-ipad-ipadmini.png', type: 'image/png' },
  '/direct/traffic-light-ipadpro.png': { file: 'direct/traffic-light-ipadpro.png', type: 'image/png' },
  '/direct/traffic-light-iphone-retina.png': { file: 'direct/traffic-light-iphone-retina.png', type: 'image/png' },
  '/direct/traffic-light-iphone.png': { file: 'direct/traffic-light-iphone.png', type: 'image/png' }

};

/////////////////////////////////////////////////////////////////

http.createServer((req, res) => {

  // whitelist based server
  if (req.method === 'GET') {

    let info = urls[req.url];
    if (info) return serveFile(info.file, info.type, res);

  } else if (req.method === 'POST') {

    if (req.url === '/run') return runCommand(req, res);

  }

  res.statusCode = 404; // not found
  res.end();

}).listen(port);

/////////////////////////////////////////////////////////////////

console.log(`Server listening on port ${port}`);

/////////////////////////////////////////////////////////////////
