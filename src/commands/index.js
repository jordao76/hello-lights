/**
 * Parsing of commands and utilities.
 * @namespace commands
 */

module.exports = {
  ...require('./parser'),
  ...require('./analyzer'),
  ...require('./generator'),
  ...require('./interpreter'),
  validation: require('./validation')
};
