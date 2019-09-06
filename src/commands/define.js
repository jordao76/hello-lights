/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isString, isCommand} = require('./validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function define({root, node, scope}) {
  return exec({root, node, scope, descIdx: 1, commandIdx: 2});
}

function def({root, node, scope}) {
  return exec({root, node, scope, descIdx: 0, commandIdx: 1});
}

function exec({root, node, scope, descIdx, commandIdx}) {
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

  scope.add(name, res);

  res.meta = { name, desc, params };
  if (commandNode.type === 'command') {
    res.meta.returns = commandNode.value.meta.returns;
  }

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

function validate(node, root, descIdx) {
  let errors = [];
  validatePosition(node, root, errors);
  validateName(node, errors);
  validateDescription(node, descIdx, errors);
  return errors;
}

function validateName(node, errors) {
  let nameArg = node.args[0];
  if (isVar(nameArg)) {
    errors.push(badVariable(node, nameArg, 0));
  } else if (nameArg.value === def.meta.name || nameArg.value === define.meta.name) {
    errors.push(badRedefine(node, nameArg));
  }
}

function validateDescription(node, descIdx, errors) {
  if (descIdx === 0) return; // no description, just a name
  let descArg = node.args[descIdx];
  if (isVar(descArg)) {
    errors.push(badVariable(node, descArg, descIdx));
  }
}

function validatePosition(node, root, errors) {
  if (node !== root) {
    errors.push(badPosition(node));
  }
}

/////////////////////////////////////////////////////////////////////////////

const badVariable = (node, arg, paramIdx) => {
  let param = define.meta.params[paramIdx];
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`
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
