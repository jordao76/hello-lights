"use strict";

///////////////

var trafficlight = require('../src/traffic-light.js');
var {CommandParser} = require('../src/command-parser.js');

///////////////

class WebLight extends trafficlight.Light {
  constructor(selector) {
    super();
    this.elLight = document.querySelector(selector);
    this.elLight.addEventListener('click', () => this.toggle());
  }
  toggle() {
    super.toggle();
    this.elLight.classList.toggle('on');
  }
  turnOn() {
    super.turnOn();
    this.elLight.classList.add('on');
  }
  turnOff() {
    super.turnOff();
    this.elLight.classList.remove('on');
  }
}

///////////////

window.cancel = function() {
  cp.cancel();
}

var cp = new CommandParser();
window.execute = async function(str, shouldCancel = true) {
  if (shouldCancel) cancel();
  console.log(`Executing command '${str}'`);
  try {
    return await cp.execute(str, tl);
  } catch (e) {
    console.error(`Error executing command '${str}'`);
    console.error(e.toString());
  }
}

window.help = function(commandName) {
  if (commandName === undefined) {
    var commandList = cp.commandList.map(c=>`    ${c}`);
    console.log([
      `Commands for the traffic light`,
      `> help()`,
      `> help('command name')`,
      `> execute('command')`,
      `> cancel()`,
      `  available commands:`,
      ...commandList
    ].join('\n'));
  }
  else {
    var command = cp.commands[commandName];
    if (command === undefined) {
      help();
      return;
    }
    let usage = (c) => `${c.doc.name} ${c.paramNames.map(n=>':'+n).join(' ')}`;
    console.log([
      usage(command),
      command.doc.desc
    ].join('\n'));
  }
}

function utter(str) {
  try {
    var synth = window.speechSynthesis;
    var utterance = new SpeechSynthesisUtterance(str);
    synth.speak(utterance);
  } catch(e) {}
}

///////////////

async function main() {
  var r = new WebLight('#tl > .red');
  var y = new WebLight('#tl > .yellow');
  var g = new WebLight('#tl > .green');
  window.tl = new trafficlight.TrafficLight(r,y,g);
  help();
  utter("Open the java script console");
  execute('danger');
}

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
