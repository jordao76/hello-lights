const {and} = require('./validation');

/////////////////////////////////////////////////////////////////////////////

class Analyzer {

  constructor(scope) {
    this.scope = scope;
  }

  analyze(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      this.root = node;
      this.params = [];
      return this.recur(node);
    })
      .reduce((acc, val) => acc.concat(val), []) // flatten: macros can return a list of nodes
      .filter(node => !!node); // macros can remove the node by returning null
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
    let errors = new Validator(this.scope, this.params).validate(node);
    this.errors.push(...errors);

    if (node === this.root) {
      node.params = this.params;
    }
    // check and run if it's a macro
    if (errors.length === 0 && node.value.meta.isMacro) {
      return this.runMacro(node);
    }

    return node;
  }

  runMacro(node) {
    let macro = node.value;
    let res = macro({
      root: this.root,
      node: node,
      scope: this.scope
    });
    if (res) {
      if (Array.isArray(res) && isError(res[0])) {
        // multiple errors
        this.errors.push(...res);
        return node;
      }
      if (isError(res)) {
        // single error
        this.errors.push(res);
        return node;
      }
    }
    return res;
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

  constructor(scope, params) {
    this.scope = scope;
    this.params = params;
  }

  validate(node) {
    let name = node.name;

    let command = this.scope.lookup(name);
    if (!command) return [badCommand(name, node.loc)];
    node.value = command;

    let args = node.args;
    let params = command.meta.params;
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
        .map(arg => this._validateArg(node, arg, params[i], i)) // validate each argument group
        .filter(e => !!e)) // only keep validation errors (non null)
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    return errors;
  }

  _validateArg(node, arg, param, paramIdx) {
    arg.param = param.name;
    if (isVar(arg)) {
      this._combine(arg.name, param.validate);
    } else {
      if (isCommand(arg) && !node.value.meta.isMacro && arg.value && arg.value.meta.returns === param.validate) {
        // no error since the argument is a command that returns
        // a conforming value to the parameter validation function
        // (they are the same validation function)
        // (only if the command is not a macro)
        return null;
      }
      if (!param.validate(arg.value)) {
        return badValue(node, paramIdx, arg);
      }
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

const isVar = node => node.type === 'variable';
const isError = node => node.type === 'error';
const isCommand = node => node.type === 'command';

const badCommand = (name, loc) => ({
  type: 'error', loc,
  text: `Command not found: "${name}"`
});

const badArity = (name, exp, act, loc) => ({
  type: 'error', loc,
  text: `Bad number of arguments to "${name}": it takes ${exp} but was given ${act}`
});

const badValue = (node, paramIdx, arg) => {
  let param = node.value.meta.params[paramIdx];
  let text = isCommand(arg)
    ? `Bad call to "${arg.name}" for "${node.name}" parameter ${paramIdx + 1} ("${param.name}"), expected: ${param.validate.exp}`
    : `Bad value "${arg.value}" to "${node.name}" parameter ${paramIdx + 1} ("${param.name}"), expected: ${param.validate.exp}`;
  return { type: 'error', loc: arg.loc, text };
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {Analyzer};
