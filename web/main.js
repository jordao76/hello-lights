"use strict";

///////////////

function transfer(s,d) {
  for (let [k,v] of Object.entries(s)) {
    d[k]=v;
  }
}
transfer(require('../src/traffic-light.js'),window);
transfer(require('../src/commands.js'),window);

///////////////

class WebLight {
  constructor(selector) {
    this.$light = $(selector);
    this.$light.on('click', () => this.toggle());
  }
  get on() { return this.$light.hasClass('on'); }
  toggle() { this.$light.toggleClass('on'); }
}

///////////////

$(() => {
  var r = new WebLight('#tl > .red');
  var y = new WebLight('#tl > .yellow');
  var g = new WebLight('#tl > .green');
  window.tl = new TrafficLight(r,y,g);
  cycle(tl, 150);
});
