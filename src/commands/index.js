/**
 * Parsing of commands and utilities.
 * @namespace commands
 */

module.exports = {
  ...require('./doc-parser'),
  ...require('./parser'),
  ...require('./analyzer'),
  ...require('./generator'),
  ...require('./interpreter'),
  ...require('./cancellable'),
  validation: require('./validation')
};
