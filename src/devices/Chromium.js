let {Device, DeviceManager} = require('../device');
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
        'file://'+path.resolve('./src/devices/chromium-page/index.html')
      ]
    });
    this.serialNum = this.browser.wsEndpoint();
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
          document.getElementById(light).classList[change]('on')
        },
        light, change
      );
    } catch (e) {
      this.disconnect();
    }
  }

  async close() {
    await this.browser.close();
    this.disconnect();
  }

}

///////////////

class ChromiumDeviceManager extends DeviceManager {

  constructor() {
    super('chromium');
    this.device = new ChromiumDevice();
  }

  allDevices() {
    if (!this.device.isConnected) {
      this.device.open(); // no await
    }
    return [this.device];
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
