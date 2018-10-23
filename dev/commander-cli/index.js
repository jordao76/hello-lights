/////////////////////////////////////////////////////////////////

// Three possibilities for `device`: cleware (default), electron or chromium (or anything else really)
const deviceName = process.argv[2] || 'cleware';
const devicePath =
  deviceName === 'cleware' ? 'hello-lights/lib/devices/cleware-switch1'
    : deviceName === 'electron' ? 'electron-device'
      : 'chromium-device'; // fallback is chromium
const {Manager} = require(devicePath);

const {Commander} = require('hello-lights');

// Two possibilities for selector: single (default) or multi (or anything else really)
const selectorName = process.argv[3] || 'single';
const selectorProperty =
  selectorName === 'single'
    ? 'PhysicalTrafficLightSelector'
    : 'PhysicalMultiTrafficLightSelector'; // fallback is multi
const SelectorCtor = require('hello-lights').selectors[selectorProperty];

/////////////////////////////////////////////////////////////////

const blue = '\x1b[34m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const logger = {
  log: (...args) => {
    console.log(blue, ...args, reset);
  },
  error: (...args) => {
    console.error(red, ...args, reset);
  }
};

/////////////////////////////////////////////////////////////////

const commander = new Commander({
  logger,
  manager: Manager,
  selectorCtor: SelectorCtor
});

/////////////////////////////////////////////////////////////////

module.exports = {commander, Manager};
