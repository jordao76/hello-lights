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
 * @extends TrafficLight
 */
class MultiTrafficLight extends TrafficLight {

  /**
   * @param {TrafficLight[]} trafficLights - Traffic lights composed.
   */
  constructor(trafficLights) {
    super(
      new MultiLight(trafficLights.map(tl => tl.red)),
      new MultiLight(trafficLights.map(tl => tl.yellow)),
      new MultiLight(trafficLights.map(tl => tl.green)));
    this.trafficLights = trafficLights;
  }

  /**
   * If any of the composed traffic lights is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this.trafficLights.some(tl => tl.isEnabled);
  }

}

///////////////

/**
 * A composite traffic light with a flexible way to select which composed
 * traffic lights are active.
 * @extends TrafficLight
 * @see FlexMultiTrafficLight#use
 */
class FlexMultiTrafficLight extends TrafficLight {

  /**
   * @param {TrafficLight[]} trafficLights - Traffic lights composed.
   *   Must not be empty.
   */
  constructor(trafficLights) {
    // starts using the first traffic light
    super(
      trafficLights[0].red,
      trafficLights[0].yellow,
      trafficLights[0].green);
    this.tls = trafficLights;
    this.use([0]);
  }

  /**
   * Selects which traffic lights to use given their indexes (0-based).
   * Indexes wrap around from the last to the first.
   * @param {number[]} indexes - Traffic light indexes to use.
   *   Must not be empty.
   */
  use(indexes) {
    this.indexes = indexes.map(i => i % this.tls.length);
    let tls = this.indexes.map(i => this.tls[i]); // chosen traffic lights
    this.tl = tls.length === 1 ? tls[0] : new MultiTrafficLight(tls);
    this.red = this.tl.red;
    this.yellow = this.tl.yellow;
    this.green = this.tl.green;
  }

  /**
   * Selects the next traffic light to use, going back to the first one if
   * the currently selected one is the last.
   * Also works with multiple selected traffic lights, moving all to the next.
   */
  next() {
    this.use(this.indexes.map(i => i + 1));
  }

  /**
   * Selects all traffic lights to use simultaneously.
   */
  useAll() {
    this.use(this.tls.map((_, i) => i));
  }

  /**
   * Resets all traffic lights and switches back to using only the first one.
   */
  reset() {
    this.tls.forEach(tl => tl.reset());
    this.use([0]);
  }

  /**
   * If the active traffic light is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this.tl.isEnabled;
  }

}

///////////////

module.exports = {
  MultiLight, MultiTrafficLight, FlexMultiTrafficLight
};
