const parser = require('./peg-parser');

/////////////////////////////////////////////////////////////////////////////

class Parser {

  parse(text) {
    this.errors = [];
    try {
      return parser.parse(text);
    } catch (e) {
      this.errors.push(parseError(e));
      return null;
    }
  }

}

/////////////////////////////////////////////////////////////////////////////

function parseError(e) {
  return {
    type: 'error',
    text: e.toString(),
    loc: formatLocation(e.location)
  };
}

function formatLocation(location) {
  let start = location.start;
  let end = location.end;
  return `${start.line}:${start.column}-${end.line}:${end.column}`;
}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Parser};
