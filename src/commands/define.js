/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isString, isCommand} = require('./validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function define({root, node, commands}) {
  return exec({root, node, commands, descIdx: 1, commandIdx: 2});
}

function def({root, node, commands}) {
  return exec({root, node, commands, descIdx: 0, commandIdx: 1});
}

function exec({root, node, commands, descIdx, commandIdx}) {
  let errors = validate(node, root, descIdx);
  if (errors.length > 0) return errors;

  let name = node.args[0].value;
  let desc = node.args[descIdx].value;
  let commandNode = node.args[commandIdx];
  let params = node.params;

  let [command] = new Generator().generate([commandNode]);
  let res = (ctx, args) => {
    let {scope = {}} = ctx;
    params.forEach((param, i) => scope[param.name] = args[i]);
    return command({...ctx, scope});
  };
  res.meta = { name, desc, params };
  commands[name] = res;

  return null;
}

/////////////////////////////////////////////////////////////////////////////

define.meta = {
  name: 'define',
  isMacro: true,
  params: [
    { name: 'name', validate: isIdentifier },
    { name: 'description', validate: isString },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Defines a new command or redefines an existing one,
    where variables (identifiers starting with :) become parameters.
    @example
    (define burst
      "Burst of light"
      (twinkle :light 80))

    ; use the new command
    (burst red)`
};

/////////////////////////////////////////////////////////////////////////////

def.meta = {
  name: 'def',
  isMacro: true,
  params: [
    { name: 'name', validate: isIdentifier },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Defines a new command or redefines an existing one,
    where variables (identifiers starting with :) become parameters.
    @example
    (def burst
      (twinkle :light 80))

    ; use the new command
    (burst red)`
};

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

const validate = (node, root, descIdx) => {
  let errors = [];

  let nameArg = node.args[0];
  if (isVar(nameArg)) {
    errors.push(badVariableAsName(node, nameArg));
  } else if (nameArg.value === 'def' || nameArg.value === 'define') {
    errors.push(badRedefine(node, nameArg));
  }

  if (descIdx > 0) {
    let descArg = node.args[descIdx];
    if (isVar(descArg)) {
      errors.push(badVariableAsDesc(node, descArg));
    }
  }

  if (node !== root) {
    errors.push(badPosition(node));
  }

  return errors;
};

const badVariableAsName = (node, arg) => {
  let param = def.meta.params[0]; // "name" param, both "def" and "define" have the same
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter 1 ("${param.name}"), must be ${param.validate.exp}`
  };
};

const badVariableAsDesc = (node, arg) => {
  let param = define.meta.params[1]; // "description" param
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter 2 ("${param.name}"), must not be a variable`
  };
};

const badPosition = node => ({
  type: 'error',
  loc: node.loc,
  text: `"${node.name}" cannot be nested`
});

const badRedefine = (node, arg) => ({
  type: 'error',
  loc: node.loc,
  text: `"${arg.value}" cannot be redefined`
});

/////////////////////////////////////////////////////////////////////////////

const commands = {def, define};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////
