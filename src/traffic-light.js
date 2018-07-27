///////////////////////////////////////////////////////////////////

/** A Light in a traffic light. */
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

/** A Traffic Light with red, yellow and green lights. */
class TrafficLight {

  /**
   * @param {Light} [red] - Red light.
   * @param {Light} [yellow] - Yellow light.
   * @param {Light} [green] - Green light.
   */
  constructor(red, yellow, green) {
    /** The red light.
      * @type {Light}  */
    this.red = red || new Light;
    /** The yellow light.
     * @type {Light}  */
    this.yellow = yellow || new Light;
    /** The green light.
     * @type {Light}  */
    this.green = green || new Light;
  }

  /** Sets all lights to off. */
  reset() {
    this.red.turnOff();
    this.yellow.turnOff();
    this.green.turnOff();
  }

}

///////////////////////////////////////////////////////////////////

module.exports = {
  Light, TrafficLight
};
