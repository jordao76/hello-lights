const parser = require('./doc-peg-parser');

/////////////////////////////////////////////////////////////////////////////

class DocParser {

  parse(text) {
    return parser.parse(text);
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { DocParser };
