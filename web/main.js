var trafficlight = require('../src/traffic-light.js');
var {CommandParser} = require('../src/command-parser.js');
let defineCommands = require('../src/traffic-light-commands.cljs');

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

function info(str) {
  console.log(str);
}

function error(str) {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = str;
  divError.style.display = '';
  console.error(str);
}

function clearError() {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = '';
  divError.style.display = 'none';
}

///////////////

var cp = new CommandParser(); defineCommands(cp);

///////////////

async function execute(commandStr) {
  clearError();
  cp.cancel();
  info(`Executing command '${commandStr}'`);
  try {
    await cp.execute(commandStr, window.tl);
    info(`Finished command '${commandStr}'`);
    if (commandStr.match(/define/)) {
      showHelp();
    }
  } catch (e) {
    error(`Error executing command.\n${e}`);
  }
};

///////////////

function showHelp() {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2>Commands</h2>';
  for (let i = 0; i < cp.commandList.length; ++i) {
    let commandName = cp.commandList[i];
    let command = cp.commands[commandName];
    let usage = (c) => `<hr /><h3><code>${c.doc.name} ${c.paramNames.map(n => ':'+n).join(' ')}</code></h3>`;
    divHelp.innerHTML += [
      usage(command),
      command.doc.desc.replace(/:(\s*\(.+\)\s*)$/, `:<br /><code><a href="#top" class="sample">$1</a></code>`)
    ].join('');
  }
  divHelp.innerHTML += '<hr />';
  setUpSamples();
};

///////////////

function setUpButtons() {
  let txtCommand = document.querySelector('#command');
  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => execute(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => cp.cancel());

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => execute('reset'));
}

///////////////

function setUpSamples() {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => runCommand(txtSample.innerText)));
}

///////////////

function runCommand(command) {
  execute('reset');
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  execute(command);
}

///////////////

function setUpTrafficLight() {
  var r = new WebLight('#tl > .red');
  var y = new WebLight('#tl > .yellow');
  var g = new WebLight('#tl > .green');
  window.tl = new trafficlight.TrafficLight(r, y, g);
}

///////////////

async function main() {
  setUpTrafficLight();
  showHelp();
  setUpButtons();
  runCommand('pulse green');
}

///////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
