let {PhysicalTrafficLight} = require('../physical-traffic-light');
let {Device} = require('../device');
let puppeteer = require('puppeteer');
let path = require('path');
let {pause} = require('../commands');

///////////////

module.exports = function(options={}) {

  var module = {};

  ///////////////

  // returns random j such that i ≤ j < n
  let random = (i, n) => Math.floor(Math.random() * (n - i) + i);

  ///////////////

  class ChromiumDevice extends Device {

    constructor() {
      super(null, false); // the serial number is not defined on construction
    }

    async open() {
      this.browser = await puppeteer.launch({
        headless:
          typeof options.headless === 'boolean' ? options.headless : false,
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
      this.connect();
    }

    async turn(lightNum, on) {
      if (!this.isConnected) return;
      let light = ['red', 'yellow', 'green'][lightNum];
      let change = on ? 'add' : 'remove';
      try {
        await pause(random(1, 30)); // simulate latency
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
  module.ChromiumDevice = ChromiumDevice;

  ///////////////

  let chromiumDevice;
  async function resolveConnectedTrafficLight() {
    if (!chromiumDevice) {
      chromiumDevice = new ChromiumDevice();
    }
    if (!chromiumDevice.isConnected) {
      await chromiumDevice.open();
    }
    return new PhysicalTrafficLight(chromiumDevice);
  }
  module.resolveConnectedTrafficLight = resolveConnectedTrafficLight;

  ///////////////

  return module;
};
