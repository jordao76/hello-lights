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
toggle.meta = {
  name: 'toggle',
  params: [{ name: 'light', validate: isLight }],
  desc: `
    Toggles the given light.
    @example
    (toggle green)`
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.meta = {
  name: 'turn',
  params: [
    { name: 'light', validate: isLight },
    { name: 'state', validate: isState }
  ],
  desc: `
    Turns the given light on or off.
    @example
    (turn green on)`
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.meta = {
  name: 'reset',
  params: [],
  desc: `Sets all lights to off.`
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
