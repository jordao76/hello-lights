//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Traffic Light.
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////////////////////////////

const isOn = state =>
  (state === 'off' || state === 'false') ? false : !!state;

const turnLight = (oLight, state) =>
  oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

const isLight = l => l === 'red' || l === 'yellow' || l === 'green';
isLight.exp = '"red", "yellow" or "green"';

const isState = s => s === 'on' || s === 'off';
isState.exp = '"on" or "off"';

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
  cp.commands.toggle = toggle;
  cp.commands.turn = turn;
  cp.commands.reset = reset;
  // add higher-level commands
  require('./traffic-light-commands.cljs')(cp);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  toggle, turn, reset,
  defineCommands
};
