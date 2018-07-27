let { Light, TrafficLight } = require('./traffic-light');

///////////////

const RED=0, YELLOW=1, GREEN=2;
const ON=1, OFF=0;

///////////////

/**
 * A physical light in a traffic light.
 * @extends Light
 */
class PhysicalLight extends Light {

  /**
   * @param {number} lightNum - The light number for this light.
   * @param {Device} device - The device associated with this light.
   */
  constructor(lightNum, device) {
    super();
    this.lightNum = lightNum;
    this.device = device;
  }

  /**
   * Toggles the light if its device is connected.
   * @see Device#turn
   */
  async toggle() {
    if (!this.device.isConnected) return;
    super.toggle();
    await this.device.turn(this.lightNum, +this.on);
  }

  /**
   * Turn the light on if its device is connected.
   * @see Device#turn
   */
  async turnOn() {
    if (!this.device.isConnected) return;
    super.turnOn();
    await this.device.turn(this.lightNum, ON);
  }

  /**
   * Turn the light off if its device is connected.
   * @see Device#turn
   */
  async turnOff() {
    if (!this.device.isConnected) return;
    super.turnOff();
    await this.device.turn(this.lightNum, OFF);
  }

  /**
   * Syncs the physical light in the device with the state of this instance.
   * @see Device#turn
   */
  async sync() {
    if (!this.device.isConnected) return;
    await this.device.turn(this.lightNum, +this.on);
  }

}

///////////////

/**
 * A physical traffic light.
 * @extends TrafficLight
 */
class PhysicalTrafficLight extends TrafficLight {

  /**
   * @param {Device} device - The device associated with this traffic light.
   * @param {PhysicalLight} [red] - Red light.
   * @param {PhysicalLight} [yellow] - Yellow light.
   * @param {PhysicalLight} [green] - Green light.
   */
  constructor(device, red, yellow, green) {
    super(
      red || new PhysicalLight(RED, device),
      yellow || new PhysicalLight(YELLOW, device),
      green || new PhysicalLight(GREEN, device)
    );
    this.device = device;
  }

  async reset() {
    await Promise.all([
      this.red.turnOff(),
      this.yellow.turnOff(),
      this.green.turnOff()
    ]);
  }

  /**
   * Syncs the physical lights in the device with the state of this instance.
   */
  async sync() {
    if (!this.device.isConnected) return;
    await Promise.all([
      this.red.sync(),
      this.yellow.sync(),
      this.green.sync()
    ]);
  }

}

///////////////

module.exports = {
  RED, YELLOW, GREEN,
  ON, OFF,
  PhysicalLight, PhysicalTrafficLight
};
