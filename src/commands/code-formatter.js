const parser = require('./formatter-peg-parser');

/////////////////////////////////////////////////////////////////////////////

/**
 * A formatter for command code.
 * Inherit from this class and override the desired methods to adjust the formatting.
 * @memberof commands
 */
class CodeFormatter {

  /**
   * Formats command code.
   * @param {string} code - Command code to format.
   * @returns {string} The formatted command code.
   */
  format(code) {
    try {
      let nodes = parser.parse(code);
      return this._process(nodes).join('');
    } catch (e) {
      return code;
    }
  }

  _process(nodes) {
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    return nodes.map(node => this[`format${capitalize(node.type)}`](node.text));
  }

  /**
   * Formats parenthesis.
   * @param {string} text - Opening or closing parenthesis.
   * @returns {string} Formatted parenthesis.
   */
  formatParens(text) { return text; }

  /**
   * Formats a command name.
   * @param {string} text - Command name.
   * @returns {string} Formatted command name.
   */
  formatCommand(text) { return text; }

  /**
   * Formats a variable.
   * @param {string} text - Variable.
   * @returns {string} Formatted variable.
   */
  formatVariable(text) { return text; }

  /**
   * Formats an identifier.
   * @param {string} text - Identifier.
   * @returns {string} Formatted identifier.
   */
  formatIdentifier(text) { return text; }

  /**
   * Formats a number.
   * @param {number} num - Number.
   * @returns {string} Formatted number.
   */
  formatNumber(num) { return num.toString(); }

  /**
   * Formats a string.
   * @param {string} text - String.
   * @returns {string} Formatted string.
   */
  formatString(text) { return text; }

  /**
   * Formats a space (blanks or newlines).
   * @param {string} text - Space.
   * @returns {string} Formatted space.
   */
  formatSpace(text) { return text; }

  /**
  * Formats a comment.
  * @param {string} text - Comment text.
  * @returns {string} Formatted comment.
  */
  formatComment(text) { return text; }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { CodeFormatter };
