let {Device, DeviceManager} = require('hello-lights').physical;
const net = require('net')
const EventEmitter = require('events');
const path = require('path');
const {spawn} = require('child_process');
const PIPE_PATH = require('./pipe-path');
const match = require('./match');

////////////////////////////////////////////////////////////////

function launch() {
  let command = path.resolve(`${__dirname}/node_modules/.bin/electron`);
  let script = path.resolve(`${__dirname}/electron-main.js`);
  let args = [script, '--color'];
  if (process.platform === 'win32') {
    args = ['/s', '/c', command + '.cmd', ...args];
    command = 'cmd';
  }
  let subprocess = spawn(command, args, {
    stdio: ['ignore', process.stdout, process.stderr]
  });
  subprocess.on('exit', () => process.exit());
}

////////////////////////////////////////////////////////////////

class ElectronDevice extends Device {

  constructor(stream, serialNum) {
    super(serialNum);
    this.stream = stream;
  }

  async turn(lightID, onOff) {
    if (!this.isConnected) return;
    this.stream.write(`turn ${this.serialNum} ${lightID} ${+onOff}\n`);
  }

}

////////////////////////////////////////////////////////////////

class ElectronDeviceManager extends DeviceManager {

  constructor() {
    super('electron');
    this.devices = {}; // indexed by serialNum
    this.serve();
    launch();
  }

  serve() {
    net.createServer(stream => {
      this.stream = stream;
      stream.on('data', data => {
        data = data.toString();
        if (match(data, /added (\d+)/, serialNum => {
          this.devices[serialNum] = new ElectronDevice(stream, serialNum);
          this.emit('added');
        })) return;
        if (match(data, /removed (\d+)/, serialNum => {
          this.devices[serialNum].disconnect();
          this.emit('removed');
        })) return;
      });
    }).listen(PIPE_PATH);
  }

  allDevices() {
    return Object.values(this.devices);
  }

  async newDevice() {
    this.stream.write('new-window\n');
    this.emit('added');
  }

}

////////////////////////////////////////////////////////////////

let Manager = new ElectronDeviceManager();

////////////////////////////////////////////////////////////////

module.exports = {
  Manager
};
