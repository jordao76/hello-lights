const {Light, TrafficLight} = require('../src/traffic-light/traffic-light');
const {FlexMultiTrafficLight} = require('../src/traffic-light/multi-traffic-light');

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
    if (this.elSwitch) {
      this.elSwitch.addEventListener('click', () => this._setEnabled(this.elSwitch.checked));
    }
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
    this.n = n;
  }
  _createTrafficLight(selector, switchSelector) {
    let tl = new WebTrafficLight(selector, switchSelector);
    return tl;
  }
  resolveTrafficLight() {
    return this._tl.isEnabled ? this._tl : null;
  }
  setUpMultiCommands(commander) {
    if (this.n > 1) {
      const {defineCommands} = require('../src/traffic-light/multi-traffic-light-commands');
      defineCommands(commander.parser);
    }
  }
}

////////////////////////////////////////////////////////////////////////////

module.exports = {
  MultiTrafficLightSelector
};
