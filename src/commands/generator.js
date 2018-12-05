/////////////////////////////////////////////////////////////////////////////

class Generator {

  generate(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      if (!this.validateTopLevel(node)) return null;
      return this.recur(node);
    });
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
    let args = node.args.map(arg => this.recur(arg));
    return (ctx, vars = []) => command(ctx, resolve(args, vars));
  }

  value(node) {
    return node.value;
  }

  variable(node) {
    return node; // unchanged
  }

}

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

const resolve = (args, vars) => {
  let varIdx = 0;
  return args.map(arg => isVar(arg) ? vars[varIdx++] : arg);
};

/////////////////////////////////////////////////////////////////////////////

const badParameter = (name, locs) =>
  locs.map(loc => ({
    type: 'error', loc,
    text: `"${name}" is not defined`
  }));

/////////////////////////////////////////////////////////////////////////////

module.exports = {Generator};
