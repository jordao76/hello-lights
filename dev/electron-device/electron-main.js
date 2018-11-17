const {app, BrowserWindow} = require('electron');
const net = require('net');
const EventEmitter = require('events');
const path = require('path');
const PIPE_PATH = require('./pipe-path');
const match = require('./match');

////////////////////////////////////////////////////////////////

const int = str => parseInt(str, 10);

////////////////////////////////////////////////////////////////

class TrafficLightWindow extends EventEmitter {

  constructor() {
    super();
    this.isConnected = false;
  }

  async open() {
    if (this.isConnected || this.connecting) return;
    this.connecting = true;

    this.win = new BrowserWindow({ width: 213, height: 565, alwaysOnTop: true });
    this.win.setMenu(null);
    this.win.setResizable(false);
    this.win.loadFile(path.resolve(`${__dirname}/ui/index.html`));
    this.win.on('closed', () => this.disconnect());

    return new Promise(resolve => {
      this.win.webContents.on('did-finish-load', () => {
        this.serialNum = this.win.webContents.getProcessId().toString();
        this.connecting = false;
        this.connect();
        resolve();
      });
    });
  }

  turn(lightNum, on) {
    if (!this.isConnected) return;
    this.win.webContents.send('turn', {lightNum, on});
  }

  connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    this.emit('connected');
  }

  disconnect() {
    if (!this.isConnected) return;
    this.isConnected = false;
    this.win = null;
    this.emit('disconnected');
  }

}

////////////////////////////////////////////////////////////////

class TrafficLightWindowManager extends EventEmitter {

  constructor() {
    super();
    this.windows = {}; // indexed by serialNum
    app.on('ready', async () => {
      await this.newWindow();
    });
  }

  async newWindow() {
    let window = new TrafficLightWindow();
    await window.open();
    window.on('disconnected', () => this.emit('removed', window));
    this.windows[window.serialNum] = window;
    this.emit('added', window);
  }

}

////////////////////////////////////////////////////////////////

let manager = new TrafficLightWindowManager();
let client = net.connect(PIPE_PATH);

const turn = (serialNum, lightNum, on) => manager.windows[serialNum].turn(int(lightNum), int(on));
const newWindow = () => manager.newWindow();
client.on('data', data => {
  data = data.toString();
  if (match(data, /turn (\w+) (\d) (\d)/, turn)) return;
  if (match(data, /new-window/, newWindow)) return; // eslint-disable-line no-useless-return
});
client.on('close', () => process.exit());

const added = w => client.write(`added ${w.serialNum}`);
const removed = w => {
  if (client.destroyed) return;
  client.write(`removed ${w.serialNum}`);
};
manager.on('added', added);
manager.on('removed', removed);

////////////////////////////////////////////////////////////////
