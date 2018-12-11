/**
 * Parsing of commands and utilities.
 * @namespace commands
 */

module.exports = {
  ...require('./parser'),
  ...require('./analyzer'),
  ...require('./generator'),
  ...require('./interpreter'),
  ...require('./cancellable'),
  validation: require('./validation')
};
