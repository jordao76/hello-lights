const parser = require('./peg-parser');

/////////////////////////////////////////////////////////////////////////////

class Parser {

  constructor(options = {filePath: null}) {
    this.options = options;
  }

  parse(text) {
    this.errors = [];
    try {
      return parser.parse(text, {formatter: this});
    } catch (e) {
      this.errors.push(this.formatError(e));
      return null;
    }
  }

  formatError(e) {
    return {
      type: 'error',
      text: e.toString(),
      loc: this.formatLocation(e.location, 0)
    };
  }

  formatLocation(location, endOffset = -1) {
    let start = location.start;
    let end = location.end;
    let filePart = this.options.filePath ? `${this.options.filePath}/` : '';
    return `${filePart}${start.line}:${start.column}-${end.line}:${end.column + endOffset}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Parser};
