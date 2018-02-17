"use strict";

///////////////

var trafficlight = require('../src/traffic-light.js');
var commands = require('../src/commands.js');
var Cancellable = require('../src/cancellable.js');
var CommandParser = require('../src/command-parser.js');

///////////////

class WebLight {
  constructor(selector) {
    this.$light = $(selector);
    this.$light.on('click', () => this.toggle());
  }
  get on() { return this.$light.hasClass('on'); }
  toggle() { this.$light.toggleClass('on'); }
}

var cancellable = new Cancellable;
window.cancel = function() {
  cancellable.cancel();
  cancellable = new Cancellable;
}

var cp = new CommandParser(commands);
window.execute = async function(str) {
  cancel();
  var command = cp.parse(str);
  console.log(`Executing command '${str}'`);
  var res = await commands.run(command,tl,cancellable);
  if (res instanceof Error) {
    console.error(`Error executing command '${str}'`);
    console.error(res.toString());
  }
  return res;
}

///////////////

$(() => {
  var r = new WebLight('#tl > .red');
  var y = new WebLight('#tl > .yellow');
  var g = new WebLight('#tl > .green');
  window.tl = new trafficlight.TrafficLight(r,y,g);
  execute('cycle 150 3');
});
