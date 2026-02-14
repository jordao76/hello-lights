const chalk = require('chalk');
const path = require('path');
const {Commander} = require('..');
const {MetaFormatter, CodeFormatter} = require('..').commands;

/////////////////////////////////////////////////////////////////

const logger = {
  log: (...args) => {
    console.log(chalk.gray(...args));
  },
  error: (...args) => {
    console.error(chalk.red(...args));
  }
};

/////////////////////////////////////////////////////////////////

class ChalkCodeFormatter extends CodeFormatter {

  formatCommand(text) {
    return chalk.blue(text);
  }

  formatIdentifier(text) {
    if (['red', 'yellow', 'green'].indexOf(text) >= 0) return chalk[text](text);
    return chalk.blue(text);
  }

  formatVariable(text) {
    return chalk.green(text);
  }

  formatNumber(text) {
    return chalk.magenta(text);
  }

  formatString(text) {
    return chalk.cyan(text);
  }

  formatComment(text) {
    return chalk.gray(text);
  }

}

class ChalkMetaFormatter extends MetaFormatter {

  constructor() {
    super(new ChalkCodeFormatter());
  }

  formatName(name) {
    return chalk.yellow(name);
  }

  formatParam(param) {
    return chalk.cyan(super.formatParam(param));
  }

  formatReturn($return) {
    return chalk.magenta(super.formatReturn($return));
  }

  formatInlineCode(code) {
    return chalk.cyan(`${code.trim()}`);
  }

}

/////////////////////////////////////////////////////////////////

function resolveDeviceManager(options) {
  const clewareDevicePath = '../devices/cleware-switch1';
  let devicePath;
  if (options.devicePath) {
    devicePath = path.resolve(options.devicePath);
  } else {
    // for now, it is always the case that: options.deviceType === 'cleware'
    devicePath = clewareDevicePath;
  }
  const {Manager} = require(devicePath);
  return Manager;
}

/////////////////////////////////////////////////////////////////

function resolveCommander(options) {
  return Commander[options.selector]({
    logger,
    formatter: new ChalkMetaFormatter(),
    manager: resolveDeviceManager(options),
    serialNum: options.serialNum
  });
}

/////////////////////////////////////////////////////////////////

function define(yargs) {
  yargs
    .option('device-type', {
      alias: 'd',
      describe: 'device type to use',
      choices: ['cleware'],
      default: 'cleware',
      hidden: true }) // un-hide when more than one option exists
    .option('device-path', {
      alias: 'p',
      describe: 'device type path to use, overrides --device',
      normalize: true,
      hidden: true }) // hide advanced option
    .option('serial-num', {
      alias: 'n',
      describe: 'serial number of device to use (only for "single" selector)' })
    .option('selector', {
      alias: 's',
      describe: 'selector type to use',
      choices: ['single', 'multi'],
      default: 'single' });
}

/////////////////////////////////////////////////////////////////

module.exports = {define, resolveCommander};

/////////////////////////////////////////////////////////////////
