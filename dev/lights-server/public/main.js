////////////////////////////////////////////////////////////////////////////

function run(commandStr) {
  var req = new XMLHttpRequest();
  req.open('POST', '/run', true);
  req.send(commandStr);
}

////////////////////////////////////////////////////////////////////////////

function setUpActions() {
  let txtCommand = document.querySelector('#command');
  txtCommand.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.keyCode === 13 || e.keyCode === 10)) { // CTRL+ENTER
      run(txtCommand.value);
    }
  });

  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => run(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => run('cancel'));

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => run('reset'));
}

////////////////////////////////////////////////////////////////////////////

function addLog(...args) {
  let log = document.querySelector('.log');
  let entry = document.createElement('span');
  entry.innerHTML = `<span class='date'>${new Date().toISOString()}:</span> ${args.join(' ')}<br />`;
  log.insertAdjacentElement('afterbegin', entry);
  return entry;
}

function addErrorLog(...args) {
  addLog(...args)
    .classList.add('error');
}

function setUpLogSocket() {
  const socket = io(); // eslint-disable-line no-undef
  socket.on('log', addLog);
  socket.on('log_error', addErrorLog);
}

////////////////////////////////////////////////////////////////////////////

function main() {
  setUpActions();
  setUpLogSocket();
}

////////////////////////////////////////////////////////////////////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}
