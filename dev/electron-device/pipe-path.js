const path = require('path');

////////////////////////////////////////////////////////////////

function getPipePath() {
  if (process.platform === 'win32') return path.join('\\\\.\\pipe', process.cwd(), 'pipe');
  let pipePath = path.join(process.cwd(), '.pipe');
  rimraf.sync(pipePath);
  return pipePath;
}

////////////////////////////////////////////////////////////////

const PIPE_PATH = getPipePath();

////////////////////////////////////////////////////////////////

module.exports = PIPE_PATH;
