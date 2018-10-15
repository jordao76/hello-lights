const {Commander} = require('../src/commander');
const {setUpHelp} = require('./help');
const {MultiTrafficLightSelector} = require('./web-traffic-light');

////////////////////////////////////////////////////////////////////////////

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

const logger = {
  log: info,
  error
};

////////////////////////////////////////////////////////////////////////////

function execute(commandStr) {
  clearError();
  window.commander.run(commandStr);
  if (commandStr.match(/define/)) {
    setTimeout(showHelp, 0); // yield
  }
}

////////////////////////////////////////////////////////////////////////////

function showHelp() {
  setUpHelp(window.commander, runCommand);
};

////////////////////////////////////////////////////////////////////////////

function setUpActions() {
  let txtCommand = document.querySelector('#command');
  txtCommand.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.keyCode === 13 || e.keyCode === 10)) { // CTRL+ENTER
      execute(txtCommand.value);
    }
  });

  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => execute(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => window.commander.cancel());

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => execute('reset'));
}

////////////////////////////////////////////////////////////////////////////

function runCommand(command) {
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  execute(command);
}

////////////////////////////////////////////////////////////////////////////

function setUpTrafficLight(n) {
  let selector = new MultiTrafficLightSelector('#tl', '#switch', n);
  window.commander = new Commander({logger, selector});
  selector.setUpMultiCommands(window.commander);
}

////////////////////////////////////////////////////////////////////////////

function main() {
  setUpTrafficLight(document.querySelectorAll('.traffic-light').length);
  showHelp();
  setUpActions();
  let txtCommand = document.querySelector('#command');
  execute(txtCommand.value);
}

////////////////////////////////////////////////////////////////////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
