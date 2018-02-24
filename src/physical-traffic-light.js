let { Light, TrafficLight } = require('./traffic-light');

///////////////

const RED=0, YELLOW=1, GREEN=2;
const ON=1, OFF=0;

///////////////

class PhysicalLight extends Light {

  constructor(lightNum, device) {
    super();
    this.lightNum = lightNum;
    this.device = device;
  }

  async toggle() {
    if (!this.device.isConnected) return;
    super.toggle();
    await this.device.turn(this.lightNum, +this.on);
  }

  async turnOn() {
    if (!this.device.isConnected) return;
    super.turnOn();
    await this.device.turn(this.lightNum, ON);
  }

  async turnOff() {
    if (!this.device.isConnected) return;
    super.turnOff();
    await this.device.turn(this.lightNum, OFF);
  }

}

///////////////

class PhysicalTrafficLight extends TrafficLight {

  constructor(device, red, yellow, green) {
    super(
      red || new PhysicalLight(RED, device),
      yellow || new PhysicalLight(YELLOW, device),
      green || new PhysicalLight(GREEN, device)
    );
    this.device = device;
  }

}

///////////////

module.exports = {
  RED, YELLOW, GREEN,
  ON, OFF,
  PhysicalLight, PhysicalTrafficLight
};
