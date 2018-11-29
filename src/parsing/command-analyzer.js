const {and} = require('./validation');

/////////////////////////////////////////////////////////////////////////////

class Analyzer {

  constructor(parser, commands) {
    this.parser = parser;
    this.commands = commands;
  }

  analyze(text) {
    this.errors = [];
    let nodes = this.parser.parse(text);
    return nodes.map(node => {
      this.params = [];
      node = this.recur(node);
      node.params = this.params;
      return node;
    });
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // rename params -> args // TODO change the parser!
    node.args = node.params; delete node.params;

    // recurse on the command arguments
    node.args.forEach(arg => this.recur(arg));

    // validate the command node
    let errors = new Validator(this.commands, this.params).validate(node);
    this.errors.push(...errors);

    return node;
  }

  value(node) {
    return node;
  }

  variable(node) {
    let param = this.params.find(p => p.name === node.name);
    if (!param) {
      this.params.push({ name: node.name });
    }
    return node;
  }

}

class Validator {

  constructor(commands, params) {
    this.commands = commands;
    this.params = params;
  }

  validate(node) {
    this.node = node;
    let name = node.name;

    let command = this.commands[name];
    if (!command) return [badCommand(name)];
    node.value = command;

    let args = node.args;
    let params = command.params;
    let errors = [];

    // check arity
    let hasRest = params.length > 0 && params[params.length - 1].isRest;
    if ((!hasRest && params.length !== args.length) || (hasRest && params.length > args.length)) {
      errors.push(badArity(name, params.length, args.length));
    }

    // check arguments against the parameters
    errors.push(...this._validateArgs(node, args, params));

    return errors;
  }

  _validateArgs(node, args, params) {
    return params
      .slice(0, args.length) // only parameters for which there are arguments
      .map((param, i) => param.isRest ? args.slice(i) : [args[i]]) // group arguments per parameter
      .map((group, i) => group
        .map((arg, j) => this._validateArg(arg, params[i], i, j)) // validate each argument group
        .filter(e => !!e)) // only keep validation errors (non null)
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
  }

  _validateArg(arg, param, i, j) {
    arg.param = param.name;
    if (isVar(arg)) {
      this._combine(arg.name, param.validate);
    }
    else if (!isValid(param.validate, arg)) {
      return badValue(this.node, i, j);
    }
  }

  _combine(paramName, validate) {
    let param = this.params.find(p => p.name === paramName); // global param
    param.validate = param.validate ? and(param.validate, validate) : validate;
  }

}

/////////////////////////////////////////////////////////////////////////////
// Argument utils
/////////////////////////////////////////////////////////////////////////////

const isVar = a => a && a.type === 'variable';

const isValid = (validate, a) => {
  if (!a) return false;
  return validate(a.value);
};

/////////////////////////////////////////////////////////////////////////////
// Errors
/////////////////////////////////////////////////////////////////////////////

const badCommand = (name) => `Command not found: "${name}"`;

const badArity = (name, exp, act) =>
  `Bad number of arguments to "${name}": it takes ${exp} but was given ${act}`;

const badValue = (node, i, j) => {
  let arg = node.args[j], param = node.value.params[i];
  if (arg === undefined) return null;
  return `Bad value "${arg.value}" to "${node.name}" parameter ${i+1} ("${param.name}"), must be ${param.validate.exp}`;
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {Analyzer};
