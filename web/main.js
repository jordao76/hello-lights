var trafficlight = require('../src/traffic-light.js');
var {CommandParser} = require('../src/parsing/command-parser.js');
let {defineCommands} = require('../src/traffic-light-commands');

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
  info(`Executing command '${commandStr}'`);
  cp.cancel();
  await cp.execute('reset', {tl: window.tl});
  try {
    if (commandStr.match(/define/)) {
      setTimeout(showHelp, 0);
    }
    await cp.execute(commandStr, {tl: window.tl});
    info(`Finished command '${commandStr}'`);
  } catch (e) {
    error(`Error executing command.\n${e}`);
  }
};

///////////////

function showHelp() {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  for (let i = 0; i < cp.commandList.length; ++i) {
    let commandName = cp.commandList[i];
    let command = cp.commands[commandName];
    let usage = (c) => `<h3><code>${c.doc.name} ${c.paramNames.map(n => ':'+n).join(' ')}</code></h3>`;
    divHelp.innerHTML += [
      usage(command),
      command.doc.desc
        .replace(/:(\s*\(.+\)\s*)$/s,
          (_, sample) => {
            sample = sample.trim()
              .replace(/\n {2}/g, '\n&nbsp;&nbsp;'); // indentation
            return `:<br /><br /><div class="sample">${sample}</div>`;
          }
        )
        .replace(/'([^']+)'/g, '<code class="variable">$1</code>')
        .replace(/\n/g, '<br />\n')
    ].join('');
  }
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
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.innerHTML
        .replace(/<br\s*\/?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim());
      location.hash = '#_';
    }));
}

///////////////

async function runCommand(command) {
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  await execute(command);
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
  runCommand(`
    loop
      (up 70)
      (pause 500)
      (down 70)
      (pause 500)
  `.trim().replace(/^\s{4}/gm, '')); // trim per-line indentation
}

///////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
