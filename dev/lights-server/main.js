/////////////////////////////////////////////////////////////////

let {commander} = require('commander-cli');

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
const express = require('express');

const port = process.env.PORT || 9000;
const app = express();

/////////////////////////////////////////////////////////////////

app.use(express.static(path.join(__dirname, 'public')));

app.post('/run', runCommand);

app.listen(port, () => console.log(`Server listening on port ${port}`));

/////////////////////////////////////////////////////////////////
