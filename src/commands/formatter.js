const {DocParser} = require('./doc-parser');

/////////////////////////////////////////////////////////////////////////////

/**
 * A formatter for a command metadata: its signature and description.
 * Inherit from this class and override the desired methods to adjust the formatting.
 * @memberof commands
 */
class Formatter {

  constructor() {
    this._parser = new DocParser();
  }

  /**
   * Formats a command's metadata.
   * @param {commands.Meta} meta - A command's metadata to format.
   * @returns {string} The formatted command's metadata: its signature and description.
   */
  format(meta) {
    return `${this.formatSignature(meta)}\n${this.formatDesc(meta.desc)}`;
  }

  /**
   * Formats a command's description.
   * @param {string} desc - A command's raw description.
   * @returns {string} The formatted command's description.
   */
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
    let res = this._recur(node.parts);
    return this.formatTextBlock(res) + '\n';
  }

  _block(node) {
    let res = this._recur(node.parts);
    return this.formatBlockTag(res, node.tag) + '\n';
  }

  _inline(node) {
    return this.formatInlineTag(node.value, node.tag);
  }

  /**
   * Formats a block tag found in a command's description.
   * @param {string} text - The text of the tag.
   * @param {string} tag - The tag name.
   * @returns {string} The formatted block tag.
   */
  formatBlockTag(text, tag) {
    if (tag === 'example') return this.formatCode(text);
    return this.formatTextBlock(text);
  }

  /**
   * Formats an inline tag found in a command's description.
   * @param {string} text - The text of the tag.
   * @param {string} tag - The tag name.
   * @returns {string} The formatted inline tag.
   */
  formatInlineTag(text, tag) {
    if (tag === 'code') return this.formatInlineCode(text);
    return text.trim();
  }

  /**
   * Formats a description text block. Either untagged or in a block tag.
   * @param {string} text - The text block to format.
   * @returns {string} The formatted text block.
   */
  formatTextBlock(text) {
    return text
      .trim() // trim the whole text block
      .replace(/^[ \t]+/gm, '') // trim the start or each line
      .replace(/[ \t]*([\n\r]?)$/gm, '$1'); // trim the end of each line, but keep the line break
  }

  /**
   * Formats code typically found in an example tag in a command's description.
   * @param {string} code - The raw code string to format.
   * @returns {string} The formatted code.
   */
  formatCode(code) {
    code = code.replace(/^\s*$[\n\r]*/m, ''); // remove first empty lines
    let indentSize = code.search(/[^ \t]|$/); // get indent size of first line
    return code
      .replace(new RegExp(`^[ \\t]{${indentSize}}`, 'gm'), '') // unindent
      .replace(/\s*$/, ''); // trim end
  }

  /**
   * Formats inline code in a command's description.
   * @param {string} code - The raw inline code string to format.
   * @returns {string} The formatted code.
   */
  formatInlineCode(code) {
    return `\`${code.trim()}\``;
  }

  /**
   * Formats the signature of a command.
   * @param {commands.Meta} meta - A command's metadata.
   * @returns {string} The formatted command's signature.
   */
  formatSignature(meta) {
    return `${this.formatName(meta.name)}${this.formatParams(meta.params)}${this.formatReturn(meta.returns)}`;
  }

  /**
   * Formats the name of a command.
   * @param {string} name - A command's name.
   * @returns {string} The formatted command's name.
   */
  formatName(name) {
    return name;
  }

  /**
   * Formats the parameters of a command.
   * @param {commands.Param[]} params - A command's parameters.
   * @returns {string} The formatted command's parameters.
   */
  formatParams(params) {
    if (params.length === 0) return '';
    return ' ' + params.map(param => this.formatParam(param)).join(' ');
  }

  /**
   * Formats a parameter of a command.
   * @param {commands.Param} params - A command's parameter.
   * @returns {string} The formatted command's parameter.
   */
  formatParam(param) {
    let res = `:${param.name}`;
    if (param.isRest) res += ' ...';
    return res;
  }

  /**
   * Formats the return of a command.
   * @param {commands.Validate} $return - A command's return specification.
   * @returns {string} The formatted command's return.
   */
  formatReturn($return) {
    if (!$return) return '';
    return ` -> ${$return.exp}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { Formatter };
