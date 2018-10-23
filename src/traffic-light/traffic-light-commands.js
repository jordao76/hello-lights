//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Traffic Light.
//////////////////////////////////////////////////////////////////////////////

const {turnLight} = require('./utils');
const {isLight, isState} = require('./validation');

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.paramNames = ['light'];
toggle.validation = [isLight];
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light:\n(toggle green)'
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.paramNames = ['light', 'state'];
turn.validation = [isLight, isState];
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off:\n' +
        '(turn green on)'
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.paramNames = []; // no parameters
reset.validation = []; // validates number of parameters (zero)
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off.'
};

//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  // add base commands
  cp.add('toggle', toggle);
  cp.add('turn', turn);
  cp.add('reset', reset);
  // add other commands
  require('./morse').defineCommands(cp);
  // add higher-level commands
  require('./traffic-light-commands.cljs')(cp);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  toggle, turn, reset,
  defineCommands
};
