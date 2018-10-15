const {Light, TrafficLight} = require('./traffic-light');

///////////////

/**
 * A composite light that combines all composed lights.
 * @memberof trafficLight
 * @extends trafficLight.Light
 */
class MultiLight extends Light {

  /**
   * @param {trafficLight.Light[]} lights - Lights composed.
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

let dummyLight = new Light();

///////////////

/**
 * A composite traffic light that combines all composed traffic lights.
 * Does not track or raise any `enabled` or `disabled` events for the composed
 * traffic lights.
 * @memberof trafficLight
 * @extends trafficLight.TrafficLight
 */
class MultiTrafficLight extends TrafficLight {

  /**
   * @param {trafficLight.TrafficLight[]} trafficLights - Traffic lights composed.
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

function unique(a) {
  return [...new Set(a)];
}

///////////////

/**
 * A composite traffic light with a flexible way to select which composed
 * traffic lights are active or in use.
 * @memberof trafficLight
 * @extends trafficLight.TrafficLight
 */
class FlexMultiTrafficLight extends TrafficLight {

  /**
   * Creates a new instance of this class.
   * Starts off using the first traffic light in the provided `trafficLights`.
   * Tries to checks out the provided traffic lights.
   * @param {trafficLight.TrafficLight[]} trafficLights - Traffic lights composed.
   */
  constructor(trafficLights) {
    super(dummyLight, dummyLight, dummyLight);
    this.activeMultiTrafficLight = new MultiTrafficLight([]);
    this.allTrafficLights = trafficLights.filter(tl => tl.checkOut());
    this.allTrafficLights.forEach(tl => this._subscribe(tl));
    this.use([0]);
  }

  /**
   * Adds a traffic light to the composite.
   * Tries to exclusively check it out first and because of that won't add
   * any duplicates.
   * @param {trafficLight.TrafficLight} trafficLight - Traffic light to add.
   *   Must not be null.
   */
  add(trafficLight) {
    if (!trafficLight.checkOut()) return;
    let wasEnabled = this.isEnabled;
    this.allTrafficLights.push(trafficLight);
    this._subscribe(trafficLight);
    if (this.activeTrafficLights.length === 0) {
      this.use([0]);
    }
    if (!wasEnabled && this.isEnabled) {
      this.emit('enabled');
    }
  }

  // returns an array of the tuple: (traffic light, original index)
  get enabledTrafficLights() {
    return (
      this.allTrafficLights
        .map((tl, i) => [tl, i])
        .filter(([tl, _]) => tl.isEnabled));
  }

  // returns an array of the tuple: (traffic light, original index)
  get activeTrafficLights() {
    return (
      this.enabledTrafficLights
        .filter(([tl, _], i) => this.activeIndexes.indexOf(i) >= 0));
  }

  /**
   * Selects which traffic lights to use given their indexes (0-based),
   * only considering enabled traffic lights.
   * Indexes wrap around from the last to the first.
   * @param {number[]} activeIndexes - Traffic light indexes to use.
   *   Must not be empty.
   */
  use(activeIndexes) {
    this._setIndexes(activeIndexes);
    this.activeMultiTrafficLight.trafficLights = this.activeTrafficLights.map(([tl, _]) => tl);
    this.red = this.activeMultiTrafficLight.red;
    this.yellow = this.activeMultiTrafficLight.yellow;
    this.green = this.activeMultiTrafficLight.green;
  }

  _setIndexes(activeIndexes) {
    let tlsEnabled = this.enabledTrafficLights.map(([tl, _]) => tl);
    let l = tlsEnabled.length;
    if (l > 0) {
      activeIndexes = unique(activeIndexes.map(i => i < 0 ? l + i : i % l));
    } else {
      activeIndexes = [];
    }
    activeIndexes.sort();
    this.activeIndexes = activeIndexes;
    this.indexes = this.activeTrafficLights.map(([_, i]) => i);
  }

  _subscribe(tl) {
    tl.on('enabled', () => this._enabled(tl));
    tl.on('disabled', () => this._disabled(tl));
  }

  _enabled(tl) {
    if (this.enabledTrafficLights.length === 1) {
      // the first traffic light is enabled; all were disabled before
      this.use([0]);
      this.emit('enabled');
    } else {
      // recalculate indexes
      let tlIndex = this.allTrafficLights.indexOf(tl);
      let newActiveIndexes = this.indexes.map((i, j) => this.activeIndexes[j] + (tlIndex < i ? 1 : 0));
      this.use(newActiveIndexes);
    }
  }

  _disabled(tl) {

    if (!this.isEnabled) {
      // the only enabled traffic light was disabled
      this.use([]);
      this.emit('disabled'); // 'disabled' instead of 'interrupted'
      return;
    }

    // recalculate indexes
    let tlIndex = this.allTrafficLights.indexOf(tl);
    let activeTrafficLightWasDisabled = this.indexes.indexOf(tlIndex) >= 0;

    let newActiveIndexes = this.indexes
      .map((i, j) => tlIndex === i ? -1 : (this.activeIndexes[j] - (tlIndex < i ? 1 : 0)))
      .filter(i => i >= 0);
    if (newActiveIndexes.length === 0) {
      newActiveIndexes = [0]; // re-assign
    }
    this.use(newActiveIndexes);

    if (activeTrafficLightWasDisabled) {
      /**
       * Interrupted event. In a `FlexMultiTrafficLight`, if an active traffic
       * light gets disabled, and there are still enabled traffic lights left,
       * this event is raised. If no more traffic lights are enabled,
       * then the `disabled` event is raised.
       * @event trafficLight.FlexMultiTrafficLight#interrupted
       */
      this.emit('interrupted');
    }

  }

  /**
   * Gets the traffic light indexes that are in use.
   * If there are no traffic lights in use, or no traffic lights useable,
   * returns and empty array.
   * @returns {number[]} The traffic light indexes that are in use.
   */
  using() {
    return this.activeIndexes;
  }

  /**
   * Selects the next traffic light to use, going back to the first one if
   * the currently selected one is the last.
   * Also works with multiple selected traffic lights, moving all to the next.
   */
  next() {
    this._move(+1);
  }

  /**
   * Selects the previous traffic light to use, going to the last one if
   * the currently selected one is the first.
   * Also works with multiple selected traffic lights, moving all to the previous.
   */
  previous() {
    this._move(-1);
  }

  /**
   * Selects the nearest traffic light to use, remembering the direction
   * of movement (forwards or backwards).
   * Also works with multiple selected traffic lights, moving all to the nearest,
   * following a single direction (so it's possible to wrap around at the last
   * if both the first and last indexes are in use).
   */
  near() {
    if (this.activeIndexes.length === 0) {
      this.use([0]);
      return;
    }

    let lastIndex = this.enabledTrafficLights.length - 1;
    if (this.activeIndexes.indexOf(0) >= 0) {
      this.direction = +1;
    } else if (this.activeIndexes.indexOf(lastIndex) >= 0) {
      this.direction = -1;
    }

    this._move(this.direction || +1);
  }

  _move(direction) {
    if (this.activeIndexes.length > 0) {
      this.use(this.activeIndexes.map(i => i + direction));
    } else {
      this.use([0]);
    }
  }

  /**
   * Selects the last traffic light to use.
   */
  last() {
    this.use([this.enabledTrafficLights.length - 1]);
  }

  /**
   * Selects all traffic lights to use simultaneously.
   */
  useAll() {
    this.use(this.enabledTrafficLights.map((_, i) => i));
  }

  /**
   * Resets all active traffic lights.
   */
  reset() {
    this.activeMultiTrafficLight.reset();
  }

  /**
   * If there are composed traffic lights and any of them is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this.allTrafficLights.length > 0 &&
      this.allTrafficLights.some(tl => tl.isEnabled);
  }

  toString() {
    return `multi (${this.enabledTrafficLights.length};${this.activeTrafficLights.length})`;
  }

}

///////////////

module.exports = {
  MultiLight, MultiTrafficLight, FlexMultiTrafficLight
};
