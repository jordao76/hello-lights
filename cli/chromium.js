let {Device, DeviceManager} = require('../src/device');
let puppeteer = require('puppeteer');
let path = require('path');

////////////////

class ChromiumDevice extends Device {

  constructor() {
    super(null, false); // the serial number is not defined on construction
  }

  async open() {
    if (this.isConnected || this.connecting) return;
    this.connecting = true;
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-infobars', // https://chromium.googlesource.com/chromium/src/+/d869ab3350d8ebd95222b4a47adf87ce3d3214b1
        '--window-size=250,675',
        'file://'+path.resolve('./cli/chromium-page/index.html')
      ]
    });
    this.serialNum = this.browser.wsEndpoint().replace(/^.+\//, '');
    this.browser.on('disconnected', () => this.disconnect());
    let pages = await this.browser.pages();
    this.page = pages[0];
    this.connecting = false;
    this.connect();
  }

  async turn(lightNum, on) {
    if (!this.isConnected) return;
    let light = ['red', 'yellow', 'green'][lightNum];
    let change = on ? 'add' : 'remove';
    try {
      await this.page.evaluate(
        (light, change) => {
          document.getElementById(light).classList[change]('on');
        },
        light, change
      );
    } catch (e) {
      this.disconnect();
    }
  }

  async close() {
    if (!this.browser) return;
    await this.browser.close();
    this.disconnect();
  }

}

///////////////

class ChromiumDeviceManager extends DeviceManager {

  constructor() {
    super('chromium');
    this.devices = [];
    this.newDevice();
  }

  allDevices() {
    return this.devices;
  }

  async newDevice() {
    let device = new ChromiumDevice();
    this.devices.push(device);
    device.onDisconnected(() => this.emit('removed'));
    await device.open();
    this.emit('added');
  }

  // TODO NOT USED!
  defineCommands(cp) {
    this._defineNewDevice(cp);
  }

  _defineNewDevice(cp) {
    // Note: if the last device is closed, 'new-device' can't run,
    // because commands need a connected device to run, even if they don't use it.
    // Same thing with 'define'.
    // The Manager could have its own CommandParser and separate commands from
    // the traffic lights.
    let newDevice = ctx => this.newDevice();
    newDevice.doc = {
      name: 'new-device',
      desc: 'Opens a new chromium device.'
    };
    newDevice.paramNames = [];
    newDevice.validation = [];
    cp.add('new-device', newDevice);
  }

}

////////////////

let Manager = new ChromiumDeviceManager();

///////////////

module.exports = {
  ChromiumDeviceManager,
  ChromiumDevice,
  Manager
};
