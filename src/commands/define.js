/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isCommand} = require('../parsing/validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function def({root, node, commands}) {
  let name = node.args[0].value;
  let commandNode = node.args[1];

  let [command] = new Generator().generate([commandNode]);
  command.name = command.doc = name;
  command.params = node.params;
  commands[name] = command;

  return null;
}

/////////////////////////////////////////////////////////////////////////////

def.name = 'def';
def.isMacro = true;
def.params = [
  { type: 'param', name: 'name', validate: isIdentifier },
  { type: 'param', name: 'command', validate: isCommand }
];
def.doc = `
Defines a new command or redefines an existing one,
where variables become parameters:

(def burst
  (twinkle :light 80))

(burst red)`

/////////////////////////////////////////////////////////////////////////////

const commands = {def};

/////////////////////////////////////////////////////////////////////////////

module.exports = {def, commands};

/////////////////////////////////////////////////////////////////////////////
