const {Light, TrafficLight} = require('./traffic-light');

///////////////

/**
 * A composite light that combines all composed lights.
 * @extends Light
 */
class MultiLight extends Light {

  /**
   * @param {Light[]} lights - Lights composed.
   */
  constructor(lights) {
    super();
    this.lights = lights;
    // this.on and this.off might not reflect the underlying lights,
    // just what the multi-light has been through
  }

  /** Toggles the lights. */
  toggle() {
    super.toggle();
    this.lights.forEach(l => l.toggle());
  }

  /** Turns the lights on. */
  turnOn() {
    super.turnOn();
    this.lights.forEach(l => l.turnOn());
  }

  /** Turns the lights off. */
  turnOff() {
    super.turnOff();
    this.lights.forEach(l => l.turnOff());
  }

}

///////////////

/**
 * A composite traffic light that combines all composed traffic lights.
 * Does not track or raise any `enabled` or `disabled` events for the composed
 * traffic lights.
 * @extends TrafficLight
 */
class MultiTrafficLight extends TrafficLight {

  /**
   * @param {TrafficLight[]} trafficLights - Traffic lights composed.
   */
  constructor(trafficLights) {
    super(dummyLight, dummyLight, dummyLight);
    this.trafficLights = trafficLights;
  }

  get trafficLights() {
    return this._trafficLights;
  }
  set trafficLights(trafficLights) {
    this._trafficLights = trafficLights;
    this.red    = new MultiLight(trafficLights.map(tl => tl.red));    // eslint-disable-line no-multi-spaces
    this.yellow = new MultiLight(trafficLights.map(tl => tl.yellow));
    this.green  = new MultiLight(trafficLights.map(tl => tl.green));  // eslint-disable-line no-multi-spaces
  }

  /**
   * If any of the composed traffic lights is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this._trafficLights.some(tl => tl.isEnabled);
  }

}

///////////////

let dummyLight = new Light();

function unique(a) {
  return [...new Set(a)];
}

///////////////

/**
 * A composite traffic light with a flexible way to select which composed
 * traffic lights are active or in use.
 * @extends TrafficLight
 * @see FlexMultiTrafficLight#use
 */
class FlexMultiTrafficLight extends TrafficLight {

  /**
   * Creates a new instance of this class.
   * Starts off using the first traffic light in the provided `trafficLights`,
   * which must not be empty.
   * @param {TrafficLight[]} trafficLights - Traffic lights composed.
   *   Must not be empty.
   */
  constructor(trafficLights) {
    super(dummyLight, dummyLight, dummyLight);
    this.activeMultiTrafficLight = new MultiTrafficLight([]);
    this.allTrafficLights = trafficLights;
    this.allTrafficLights.forEach(tl => this._subscribe(tl));
    this.use([0]);
  }

  _subscribe(tl) {
    tl.on('enabled', () => this._enabled(tl));
    tl.on('disabled', () => this._disabled(tl));
  }

  _enabled(tl) {
    // raise 'enabled' when the first traffic light is enabled
    if (this._enabledTrafficLights().length !== 1) return;
    this.use([0]);
    this.emit('enabled');
  }

  _disabled(tl) {
    // raise 'disabled' when the last traffic light is disabled
    if (!this.isEnabled) {
      this.use([]); // no more traffic lights to use
      this.emit('disabled');
      return;
    }

    // check if one of the active traffic lights was disabled
    if (this.activeMultiTrafficLight.trafficLights.indexOf(tl) >= 0) {
      // change the active traffic lights and raise 'interrupted'
      let newIndexes = this.activeMultiTrafficLight.trafficLights
        .map((tl, i) => tl.isEnabled ? this.indexes[i] : -1)
        .filter(i => i >= 0);
      if (newIndexes.length === 0) newIndexes = [0]; // re-assign
      this.use(newIndexes);
      this.emit('interrupted');
      return; // eslint-disable-line no-useless-return
    }
  }

  /**
   * Gets the traffic light indexes that are in use.
   * If there are no traffic lights in use, or no traffic lights useable,
   * returns and empty array.
   * @returns {number[]} The traffic light indexes that are in use.
   */
  using() {
    return this.indexes;
  }

  /**
   * Selects which traffic lights to use given their indexes (0-based),
   * only considering enabled traffic lights.
   * Indexes wrap around from the last to the first.
   * @param {number[]} indexes - Traffic light indexes to use.
   *   Must not be empty.
   */
  use(indexes) {
    this._setIndexes(indexes);
    this.activeMultiTrafficLight.trafficLights = this._activeTrafficLights();
    this.red = this.activeMultiTrafficLight.red;
    this.yellow = this.activeMultiTrafficLight.yellow;
    this.green = this.activeMultiTrafficLight.green;
  }

  _setIndexes(indexes) {
    let tlsEnabled = this._enabledTrafficLights();
    if (tlsEnabled.length > 0) {
      this.indexes = unique(indexes.map(i => i % tlsEnabled.length));
    } else {
      this.indexes = [];
    }
  }

  _activeTrafficLights() {
    let tlsEnabled = this._enabledTrafficLights();
    return this.indexes.map(i => tlsEnabled[i]);
  }

  _enabledTrafficLights() {
    return this.allTrafficLights.filter(tl => tl.isEnabled);
  }

  /**
   * Selects the next traffic light to use, going back to the first one if
   * the currently selected one is the last.
   * Also works with multiple selected traffic lights, moving all to the next.
   */
  next() {
    if (this.indexes.length > 0) {
      this.use(this.indexes.map(i => i + 1));
    } else {
      this.use([0]);
    }
  }

  /**
   * Selects all traffic lights to use simultaneously.
   */
  useAll() {
    this.use(this._enabledTrafficLights().map((_, i) => i));
  }

  /**
   * Resets all active traffic lights.
   */
  reset() {
    this.activeMultiTrafficLight.reset();
  }

  /**
   * If any of the composed traffic lights is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this.allTrafficLights.some(tl => tl.isEnabled);
  }

  toString() {
    return 'Multi Traffic Lights';
  }

}

///////////////

module.exports = {
  MultiLight, MultiTrafficLight, FlexMultiTrafficLight
};
