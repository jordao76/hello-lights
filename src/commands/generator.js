/////////////////////////////////////////////////////////////////////////////

class Generator {

  generate(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      if (this.validateTopLevel(node)) return null;
      return this.recur(node);
    });
    if (this.errors.length > 0) return null;
    return nodes;
  }

  validateTopLevel(node) {
    // process undefined parameters
    let errors = node.params
      .map(p => badParameter(p.name, p.uses))
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    this.errors.push(...errors);
    return node.params.length > 0;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    let command = node.value;
    let args = node.args.map(arg => this.recur(arg));
    return ctx => command(ctx, args);
  }

  value(node) {
    return node.value;
  }

}

/////////////////////////////////////////////////////////////////////////////

const badParameter = (name, locs) =>
  locs.map(loc => ({
    type: 'error', loc,
    text: `"${name}" is not defined`
  }));

/////////////////////////////////////////////////////////////////////////////

module.exports = {Generator};
