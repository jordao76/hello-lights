"use strict";

///////////////

var trafficlight = require('../src/traffic-light.js');
var commands = require('../src/commands.js');
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

///////////////

window.cancel = function() {
  commands.cancel();
}

var cp = new CommandParser(commands.published);
window.execute = async function(str, shouldCancel=true) {
  if (shouldCancel) cancel();
  console.log(`Executing command '${str}'`);
  var res = await cp.execute(str,tl);
  if (res instanceof Error) {
    console.error(`Error executing command '${str}'`);
    console.error(res.toString());
  }
  return res;
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
    console.log([
      `${command.name}: ${command.desc}`,
      `  usage: ${command.usage}`,
      `  sample: execute('${command.eg}')`
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
  await commands.pause(1000);
  utter("Open the java script console");
  execute('heartbeat red');
}

$(() => {
  main();
});
