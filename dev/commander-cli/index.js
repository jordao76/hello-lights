/////////////////////////////////////////////////////////////////

// Three possibilities for `device`: cleware (default, fallback), electron or chromium
const deviceName = process.argv[2] || 'cleware';
const devicePath =
  deviceName === 'chromium' ? 'chromium-device'
    : deviceName === 'electron' ? 'electron-device'
      : 'hello-lights/lib/devices/cleware-switch1'; // fallback is cleware
const {Manager} = require(devicePath);

const {Commander} = require('hello-lights');

// Two possibilities for selector: single (default) or multi (fallback)
const selectorName = process.argv[3] || 'single';
const selectorProperty =
  selectorName === 'single'
    ? 'PhysicalTrafficLightSelector'
    : 'PhysicalMultiTrafficLightSelector'; // fallback is multi
const SelectorCtor = require('hello-lights').selectors[selectorProperty];

/////////////////////////////////////////////////////////////////

const chalk = require('chalk');

/////////////////////////////////////////////////////////////////

const logger = {
  log: (...args) => {
    console.log(chalk.cyan(...args));
  },
  error: (...args) => {
    console.error(chalk.yellow(...args));
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