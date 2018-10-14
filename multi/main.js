const {Light, TrafficLight} = require('../../src/traffic-light');
const {FlexMultiTrafficLight} = require('../../src/multi-traffic-light');
const {Commander} = require('../../src/commander');

////////////////////////////////////////////////////////////////////////////

class WebLight extends Light {
  constructor(selector) {
    super();
    this.elLight = document.querySelector(selector);
    this.elLight.addEventListener('click', () => this.toggle());
    this.enabled = true;
  }
  toggle() {
    if (!this.enabled) return;
    super.toggle();
    this.elLight.classList.toggle('on');
  }
  turnOn() {
    if (!this.enabled) return;
    super.turnOn();
    this.elLight.classList.add('on');
  }
  turnOff() {
    if (!this.enabled) return;
    super.turnOff();
    this.elLight.classList.remove('on');
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
}

////////////////////////////////////////////////////////////////////////////

class WebTrafficLight extends TrafficLight {
  constructor(selector, switchSelector) {
    super(
      new WebLight(selector + ' > .red'),
      new WebLight(selector + ' > .yellow'),
      new WebLight(selector + ' > .green'));
    this.selector = selector;
    this.elTrafficLight = document.querySelector(selector);
    this.elSwitch = document.querySelector(switchSelector);
    this.elSwitch.addEventListener('click', () => this._setEnabled(this.elSwitch.checked));
    this._setEnabled(true);
  }
  get isEnabled() {
    return this.enabled;
  }
  enable() {
    this._setEnabled(true);
  }
  disable() {
    this._setEnabled(false);
  }
  _setEnabled(enabled) {
    if (this.enabled === enabled) return;
    if (!enabled) this.reset();
    [this, this.red, this.yellow, this.green].forEach(e => e.enabled = enabled);
    this.elTrafficLight.classList[enabled ? 'remove' : 'add']('disabled');
    this.emit(enabled ? 'enabled' : 'disabled');
  }
  toString() {
    return this.selector;
  }
}

////////////////////////////////////////////////////////////////////////////

const EventEmitter = require('events');

////////////////////////////////////////////////////////////////////////////

class MultiTrafficLightSelector extends EventEmitter {
  constructor(tlIdPrefix, switchIdPrefix, n) {
    super();
    let tls = [];
    for (let i = 1; i <= n; ++i) {
      tls.push(this._createTrafficLight(tlIdPrefix + i, switchIdPrefix + i));
    }
    this._tl = new FlexMultiTrafficLight(tls);
    this._tl.on('enabled', () => this.emit('enabled'));
    this._tl.on('disabled', () => this.emit('disabled'));
    this._tl.on('interrupted', () => this.emit('interrupted'));
  }
  _createTrafficLight(selector, switchSelector) {
    let tl = new WebTrafficLight(selector, switchSelector);
    return tl;
  }
  resolveTrafficLight() {
    return this._tl.isEnabled ? this._tl : null;
  }
}

////////////////////////////////////////////////////////////////////////////

function info(str) {
  console.log(str);
}

function error(str) {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = str;
  divError.style.display = '';
  console.error(str);
}

function clearError() {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = '';
  divError.style.display = 'none';
}

const logger = {
  log: info,
  error
};

////////////////////////////////////////////////////////////////////////////

function execute(commandStr) {
  clearError();
  window.commander.run(commandStr);
  if (commandStr.match(/define/)) {
    setTimeout(showHelp, 0); // yield
  }
}

////////////////////////////////////////////////////////////////////////////

function showHelp() {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commands = window.commander.commands();
  for (let i = 0; i < commands.length; ++i) {
    let commandName = commands[i];
    let command = window.commander.parser.commands[commandName]; // TODO expose in Commander
    let usage = (c) => `<h3><code>${c.doc.name} ${c.paramNames.map(n => ':'+n).join(' ')}</code></h3>`;
    divHelp.innerHTML += [
      usage(command),
      command.doc.desc
        .replace(/:(\s*\(.+\)\s*)$/s,
          (_, sample) => {
            sample = sample.trim()
              .replace(/\n {2}/g, '\n&nbsp;&nbsp;'); // indentation
            return `:<br /><br /><div class="sample">${sample}</div>`;
          }
        )
        .replace(/'([^']+)'/g, '<code class="variable">$1</code>')
        .replace(/\n/g, '<br />\n')
    ].join('');
  }
  setUpSamples();
};

////////////////////////////////////////////////////////////////////////////

function setUpActions() {
  let txtCommand = document.querySelector('#command');
  txtCommand.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.keyCode === 13 || e.keyCode === 10)) { // CTRL+ENTER
      execute(txtCommand.value);
    }
  });

  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => execute(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => window.commander.cancel());

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => execute('reset'));
}

////////////////////////////////////////////////////////////////////////////

function setUpSamples() {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.innerHTML
        .replace(/<br\s*\/?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim());
      location.hash = '#_';
    }));
}

////////////////////////////////////////////////////////////////////////////

function runCommand(command) {
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  execute(command);
}

////////////////////////////////////////////////////////////////////////////

function setUpTrafficLight() {
  let selector = new MultiTrafficLightSelector('#tl', '#switch', 7);
  window.commander = new Commander({logger, selector});
  const {defineCommands} = require('../../src/multi-traffic-light-commands');
  defineCommands(window.commander.parser);
}

////////////////////////////////////////////////////////////////////////////

async function main() {
  setUpTrafficLight();
  showHelp();
  setUpActions();
  runCommand(`
    loop
      (up 100)
      (use-near)
      (down 100)
      (use-near)
  `.trim().replace(/^\s{4}/gm, '')); // trim per-line indentation
}

////////////////////////////////////////////////////////////////////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
