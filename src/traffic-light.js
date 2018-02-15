class Light {
  constructor() { this.on = false; }
  get off() { return !this.on; }
  toggle() { this.on = !this.on; }
  turnOn() { this.on = true; }
  turnOff() { this.on = false; }
}

class TrafficLight {
  constructor(red, yellow, green) {
    this.red = red || new Light();
    this.yellow = yellow || new Light();
    this.green = green || new Light();
  }
  toString() {
    return `${+this.red.on}${+this.yellow.on}${+this.green.on}`
  }
}

module.exports = {
  Light, TrafficLight
};
