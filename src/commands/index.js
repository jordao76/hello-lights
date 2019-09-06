/**
 * Parsing of commands and utilities.
 * @namespace commands
 */

module.exports = {
  ...require('./parser'),
  ...require('./analyzer'),
  ...require('./generator'),
  ...require('./interpreter'),
  ...require('./scope'),
  ...require('./cancellable'),
  ...require('./doc-parser'),
  ...require('./meta-formatter'),
  ...require('./code-formatter'),
  validation: require('./validation')
};
