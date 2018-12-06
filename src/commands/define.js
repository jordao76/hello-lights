/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isCommand} = require('../parsing/validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function def({root, node, commands}) {
  let errors = validate(node, root);
  if (errors.length > 0) return errors;

  let name = node.args[0].value;
  let commandNode = node.args[1];
  let params = node.params;

  let [command] = new Generator().generate([commandNode]);
  let res = (ctx, args) => {
    let {scope = {}} = ctx;
    params.forEach((param, i) => scope[param.name] = args[i]);
    return command({...ctx, scope});
  };
  res.name = res.doc = name;
  res.params = params;
  commands[name] = res;

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

(burst red)`;

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

const validate = (node, root) => {
  let nameArg = node.args[0];
  let errors = [];
  if (isVar(nameArg)) {
    errors.push(badVariable(node, 0, nameArg));
  }
  if (node !== root) {
    errors.push(badPosition(node));
  }
  return errors;
};

const badVariable = (node, paramIdx, arg) => {
  let param = def.params[paramIdx];
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`
  };
};

const badPosition = node => ({
  type: 'error',
  loc: node.loc,
  text: '"def" cannot be nested'
});

/////////////////////////////////////////////////////////////////////////////

const commands = {def};

/////////////////////////////////////////////////////////////////////////////

module.exports = {def, commands};

/////////////////////////////////////////////////////////////////////////////
