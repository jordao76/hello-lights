const {and} = require('../parsing/validation');

/////////////////////////////////////////////////////////////////////////////

class Analyzer {

  constructor(commands) {
    this.commands = commands;
  }

  analyze(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      this.root = node;
      this.params = []; // TODO: stack of params, use them for all commands?
      return this.recur(node);
    }).filter(node => !!node); // macros can remove the node by returning null
    delete this.params;
    delete this.root;
    if (nodes.length === 0) return null;
    return nodes;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // recurse on the command arguments
    node.args = node.args
      .map(arg => this.recur(arg))
      .filter(arg => !!arg); // macros can remove the node by returning null

    // validate the command node
    let errors = new Validator(this.commands, this.params).validate(node);
    this.errors.push(...errors);

    if (node === this.root) {
      node.params = this.params;
    }
    // check and run if it's a macro
    if (errors.length === 0 && node.value.isMacro) {
      return this.runMacro(node);
    }

    return node;
  }

  runMacro(node) {
    let macro = node.value;
    return macro({
      root: this.root,
      node: node,
      commands: this.commands
    });
  }

  value(node) {
    return node;
  }

  variable(node) {
    let param = this.params.find(p => p.name === node.name);
    if (!param) {
      this.params.push({
        type: 'param',
        name: node.name,
        uses: [node.loc] // uses: places where the param is used
      });
    } else {
      param.uses.push(node.loc);
    }
    return node;
  }

}

/////////////////////////////////////////////////////////////////////////////

class Validator {

  constructor(commands, params) {
    this.commands = commands;
    this.params = params;
  }

  validate(node) {
    this.node = node;
    let name = node.name;

    let command = this.commands[name];
    if (!command) return [badCommand(name, node.loc)];
    node.value = command;

    let args = node.args;
    let params = command.params;
    let errors = [];

    // check arity
    let hasRest = params.length > 0 && params[params.length - 1].isRest;
    if ((!hasRest && params.length !== args.length) || (hasRest && params.length > args.length)) {
      errors.push(badArity(name, params.length, args.length, node.loc));
    }

    // check arguments against the parameters
    errors.push(...this._validateArgs(node, args, params));

    return errors;
  }

  _validateArgs(node, args, params) {
    let argGroups = params
      .slice(0, args.length) // only parameters for which there are arguments
      .map((param, i) => param.isRest ? args.slice(i) : [args[i]]); // group arguments per parameter
    let errors = argGroups
      .map((group, i) => group
        .map(arg => this._validateArg(arg, params[i], i)) // validate each argument group
        .filter(e => !!e)) // only keep validation errors (non null)
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    return errors;
  }

  _validateArg(arg, param, paramIdx) {
    arg.param = param.name;
    if (arg.type === 'variable') {
      this._combine(arg.name, param.validate);
    } else if (!param.validate(arg.value)) {
      return badValue(this.node, paramIdx, arg);
    }
  }

  _combine(paramName, validate) {
    let param = this.params.find(p => p.name === paramName); // global param
    param.validate = param.validate ? and(param.validate, validate) : validate;
  }

}

/////////////////////////////////////////////////////////////////////////////
// Errors
/////////////////////////////////////////////////////////////////////////////

const badCommand = (name, loc) => ({
  type: 'error', loc,
  text: `Command not found: "${name}"`
});

const badArity = (name, exp, act, loc) => ({
  type: 'error', loc,
  text: `Bad number of arguments to "${name}": it takes ${exp} but was given ${act}`
});

const badValue = (node, paramIdx, arg) => {
  let param = node.value.params[paramIdx];
  return {
    type: 'error', loc: arg.loc,
    text: `Bad value "${arg.value}" to "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`
  };
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {Analyzer};
