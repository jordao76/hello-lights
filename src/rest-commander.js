////////////////////////////////////////////////

const http = require('http');
const https = require('https');

////////////////////////////////////////////////

function request(baseUrl, method, path, body) {
  return new Promise((resolve, reject) => {
    let url = new URL(path, baseUrl);
    let client = url.protocol === 'https:' ? https : http;
    let options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {}
    };
    if (body != null) {
      options.headers['Content-Type'] = 'text/plain';
    }
    let req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({statusCode: res.statusCode, body: data}));
    });
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}

////////////////////////////////////////////////

/**
 * A Commander client that controls a traffic light via a remote REST API.
 * Communicates with a server started by the `serve` command.
 */
class RestCommander {

  /**
   * Creates a new RestCommander instance.
   * @param {object} [options] - Options.
   * @param {string} [options.host='http://localhost:9000'] - The base URL of
   *   the remote server (e.g. `http://localhost:9000`).
   * @param {object} [options.logger=console] - A Console-like object for logging.
   */
  constructor({host = 'http://localhost:9000', logger = console} = {}) {
    this.host = host.replace(/\/+$/, ''); // strip trailing slashes
    this.logger = logger;
  }

  /**
   * Executes a command on the remote server (fire-and-forget).
   * @param {string} command - Command to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light first.
   */
  async run(command, reset = false) {
    let path = reset ? '/run?reset=true' : '/run';
    await request(this.host, 'POST', path, command);
  }

  /**
   * Cancels any currently executing command on the remote server.
   */
  async cancel() {
    await request(this.host, 'POST', '/cancel');
  }

  /**
   * Executes definition-only commands on the remote server.
   * @param {string} command - Command with definitions to execute.
   */
  async runDefinitions(command) {
    await request(this.host, 'POST', '/definitions', command);
  }

  /**
   * Fetches all available command names from the remote server.
   * @returns {Promise<string[]>} Array of command names.
   */
  async fetchCommandNames() {
    let res = await request(this.host, 'GET', '/commands');
    return JSON.parse(res.body);
  }

  /**
   * Logs the help info for the given command name from the remote server.
   * @param {string} commandName - Name of the command.
   */
  async help(commandName) {
    let res = await request(this.host, 'GET', `/commands/${encodeURIComponent(commandName)}`);
    if (res.statusCode === 404) {
      this.logger.error(res.body);
    } else {
      this.logger.log(res.body);
    }
  }

  /**
   * Logs information about known traffic lights from the remote server.
   */
  async logInfo() {
    let res = await request(this.host, 'GET', '/info');
    let devicesInfo = JSON.parse(res.body);
    if (devicesInfo.length === 0) {
      this.logger.log('No devices found');
    } else {
      this.logger.log('Known devices:');
      devicesInfo.forEach(info =>
        this.logger.log(`device ${info.serialNum}: ${info.status}`));
    }
  }

  /**
   * Closes this instance. No-op for REST client.
   */
  close() {}

}

////////////////////////////////////////////////

module.exports = {RestCommander};

////////////////////////////////////////////////
