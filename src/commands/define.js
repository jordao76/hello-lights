/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isCommand} = require('../parsing/validation');

/////////////////////////////////////////////////////////////////////////////

function def({root, node, commands}) {
  let [nameArg, commandArg] = node.args;
  let name    = nameArg.value
    , command = commandArg.value;
  let args = commandArg.args.map(arg => arg.value);

  let defined = ctx => command(ctx, args);
  defined.name = defined.doc = name;
  commands[name] = defined;

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
