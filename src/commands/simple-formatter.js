const {DocParser} = require('./doc-parser');

/////////////////////////////////////////////////////////////////////////////

class SimpleFormatter {

  constructor() {
    this._parser = new DocParser();
  }

  format(meta) {
    return `${this.formatSignature(meta)}\n${this.formatDesc(meta.desc)}`;
  }

  formatDesc(desc) {
    let nodes = this._parser.parse(desc);
    return this._recur(nodes);
  }

  _recur(nodes) {
    return nodes.map(node => this[`_${node.type}`](node)).join('');
  }

  _text(node) {
    return node.value;
  }

  _untagged(node) {
    return this._recur(node.parts);
  }

  _block(node) {
    let res = this._recur(node.parts);
    return this.formatBlockTag(res, node.tag);
  }

  _inline(node) {
    return this.formatInlineTag(node.value, node.tag);
  }

  formatBlockTag(text, tag) {
    if (tag === 'example') return this.formatCode(text);
    return text;
  }

  formatInlineTag(text, tag) {
    if (tag === 'code') return this.formatInlineCode(text);
    return text.trim();
  }

  formatCode(code) {
    code = code.replace(/^\s*$[\n\r]*/m, ''); // remove first empty lines
    let indentSize = code.search(/[^ \t]|$/); // get indent size of first line
    return code
      .replace(new RegExp(`^[ \\t]{${indentSize}}`, 'gm'), '') // unindent
      .replace(/\s*$/, ''); // trim end
  }

  formatInlineCode(text) {
    return `\`${text.trim()}\``;
  }

  formatSignature(meta) {
    return `${this.formatName(meta.name)}${this.formatParams(meta.params)}${this.formatReturn(meta.returns)}`;
  }

  formatName(name) {
    return name;
  }

  formatParams(params) {
    if (params.length === 0) return '';
    return ' ' + params.map(param => this.formatParam(param)).join(' ');
  }

  formatParam(param) {
    let res = `:${param.name}`;
    if (param.isRest) res += ' ...';
    return res;
  }

  formatReturn($return) {
    if (!$return) return '';
    return ` -> ${$return.exp}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { SimpleFormatter };
