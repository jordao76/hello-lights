
class Generator {

  generate(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes
      .filter(node => this.validateTopLevel(node))
      .map(node => this.recur(node));
    if (this.errors.length > 0) return null;
    return nodes;
  }

  validateTopLevel(node) {
    if (!node.params) return true;
    // process undefined parameters
    let errors = node.params
      .map(p => badParameter(p.name, p.uses))
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    this.errors.push(...errors);
    return node.params.length === 0;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    let command = node.value;
    if (!command) return null;
    let params = command.meta.params;
    let args = node.args.map(arg => this.recur(arg));
    return ctx => command(ctx, resolve(ctx, params, args));
  }

  value(node) {
    return node.value;
  }

  variable(node) {
    return node; // unchanged
  }

}

/////////////////////////////////////////////////////////////////////////////

const {isCommand} = require('./validation');
const isVar = arg => arg.type === 'variable';

const resolve = (ctx, params, args) =>
  args.map((arg, i) => {

    if (isVar(arg)) {
      // lookup a variable in the scope
      return ctx.scope[arg.name];
    }

    if (isCommand(arg)) {
      // execute a command if the param doesn't expect one,
      // which means the return value from the command is what should be
      // passed to the param
      let l = params.length;
      let param = i < l ? params[i] : params[l - 1]; // take care of a rest parameter
      if (param.validate !== isCommand) {
        return arg(ctx); // no 'await', the command must not be asynchronous!
      }
    }

    return arg;
  });

/////////////////////////////////////////////////////////////////////////////

const badParameter = (name, locs) =>
  locs.map(loc => ({
    type: 'error', loc,
    text: `"${name}" is not defined`
  }));

/////////////////////////////////////////////////////////////////////////////

module.exports = {Generator};
