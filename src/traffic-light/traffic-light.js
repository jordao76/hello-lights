///////////////////////////////////////////////////////////////////

/**
 * A Light in a traffic light.
 * @memberof trafficLight
 */
class Light {

  constructor() {
    /** If the light is on.
     * @type {boolean} */
    this.on = false;
  }

  /**
   * If the light is off.
   * @type {boolean}
   */
  get off() { return !this.on; }

  /** Toggles the light. */
  toggle() { this.on = !this.on; }

  /** Turns the light on. */
  turnOn() { this.on = true; }

  /** Turns the light off. */
  turnOff() { this.on = false; }
}

///////////////////////////////////////////////////////////////////

const EventEmitter = require('events');

///////////////////////////////////////////////////////////////////

/**
 * A Traffic Light with red, yellow and green lights.
 * @memberof trafficLight
 * @extends EventEmitter
 */
class TrafficLight extends EventEmitter {

  /**
   * @param {trafficLight.Light} [red] - Red light.
   * @param {trafficLight.Light} [yellow] - Yellow light.
   * @param {trafficLight.Light} [green] - Green light.
   */
  constructor(red, yellow, green) {
    super();
    /** The red light.
      * @type {trafficLight.Light}
      */
    this.red = red || new Light;
    /** The yellow light.
     * @type {trafficLight.Light}
     */
    this.yellow = yellow || new Light;
    /** The green light.
     * @type {trafficLight.Light}
     */
    this.green = green || new Light;
    /**
     * If the traffic light is checked-out or reserved.
     * @type {boolean}
     */
    this.isCheckedOut = false;
  }

  /** Sets all lights to off. */
  reset() {
    this.red.turnOff();
    this.yellow.turnOff();
    this.green.turnOff();
  }

  /**
   * If the traffic light is enabled and ready to use.
   * @type {boolean}
   */
  get isEnabled() {
    return true;
  }

  /**
   * Checks-out or reserve the traffic light for exclusive usage, making it
   * unavailable for other users.
   * @returns {boolean} True if the traffic light was successfully checked out.
   *   False if it was already checked out.
   */
  checkOut() {
    if (this.isCheckedOut) return false;
    return this.isCheckedOut = true;
  }

  /**
   * Checks-in the traffic light, making it available for checking out again.
   */
  checkIn() {
    this.isCheckedOut = false;
  }

  /**
   * If the traffic light is available: enabled and not checked-out.
   * @type {boolean}
   */
  get isAvailable() {
    return this.isEnabled && !this.isCheckedOut;
  }

}

///////////////////////////////////////////////////////////////////

/**
 * Traffic light enabled event.
 * @event trafficLight.TrafficLight#enabled
 */

/**
 * Traffic light disabled event.
 * @event trafficLight.TrafficLight#disabled
 */

///////////////////////////////////////////////////////////////////

module.exports = {
  Light, TrafficLight
};
