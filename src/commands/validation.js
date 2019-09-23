/**
 * Command validation functions and utils.
 * @namespace validation
 * @memberof commands
 */

//////////////////////////////////////////////////////////////////////////////
// Validation function factories
//////////////////////////////////////////////////////////////////////////////

/**
 * A factory for a validation function based on a type.
 * @memberof commands.validation
 * @param {string} type - "Type" of the validation function. Any text that represents this type.
 * @param {string} [base=type] - Base JavaScript type: "string", "number", "boolean", etc.
 * @returns {commands.Validate} Validation function.
 */
const makeType = (type, base = type) => {
  const v = e => typeof e === base; // eslint-disable-line valid-typeof
  v.exp = v.type = type;
  v.base = base;
  return v;
};

/**
 * A factory for a validation function based on a number.
 * @memberof commands.validation
 * @param {string} [type='number'] - "Type" of the validation function. Any text that represents this type.
 * @param {number} [min] - Minimum value.
 * @param {number} [max] - Maximum value.
 * @returns {commands.Validate} Validation function.
 */
const makeNumber = (type = 'number', min = null, max = null) => {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  const v = n => {
    if (typeof n !== 'number') return false;
    if (hasMin && n < min) return false;
    if (hasMax && n > max) return false;
    return true;
  };
  v.base = 'number';
  v.exp = v.type = type;
  if (hasMin || hasMax) v.exp += ` [${hasMin?min:'-∞'},${hasMax?max:'+∞'}]`;
  if (hasMin) v.min = min;
  if (hasMax) v.max = max;
  return v;
};

/**
 * A factory for a validation function based on a number of string options.
 * @memberof commands.validation
 * @param {string} type - "Type" of the validation function. Any text that represents this type.
 * @param {string[]} options - Options the validation function accepts. Must not be empty.
 * @returns {commands.Validate} Validation function.
 */
const makeOptions = (type, options) => {
  const v = e => options.indexOf(e) >= 0;
  v.base = 'string';
  v.exp = `"${options.join('" or "')}"`;
  v.type = type;
  v.options = options;
  return v;
};

/**
 * A factory for a validation function that combines other validation functions with "and".
 * @memberof commands.validation
 * @package
 * @param {...commands.Validate} vfs - Validation functions to combine.
 * @returns {commands.Validate} Combined validation function.
 */
const and = (...vfs) => {
  vfs = [...new Set(vfs)]; // remove duplicates
  if (vfs.length === 1) return vfs[0];
  const v = e => vfs.every(vf => vf(e));
  v.base = 'object';
  v.exp = vfs.map(vf => vf.exp).join(' and ');
  return v;
};

//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

/**
 * A validation function for an identifier.
 * @memberof commands.validation
 * @param {string} s - String to test.
 * @returns {boolean} If the input is a valid identifier.
 */
const isIdentifier = s =>
  // A negative look behind to check for a string that does NOT end with a dash
  // is only supported on node 8.9.4 with the --harmony flag
  // https://node.green/#ES2018-features--RegExp-Lookbehind-Assertions
  // /^[a-z_][a-z_0-9-]*(?<!-)$/i
  /^[a-z_][a-z_0-9-]*$/i.test(s) && /[^-]$/.test(s);
isIdentifier.exp = 'identifier';

/**
 * A validation function for a string.
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is of type 'string'.
 */
const isString = makeType('string');

/**
 * A validation function for a command.
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is of type 'function', assumed to be a command function.
 */
const isCommand = makeType('command', 'function');

/**
 * A validation function for a number of milliseconds (mininum value 70).
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is a number of milliseconds.
 */
const isMs = makeNumber('ms', 70); // arbitrary lower limit for milliseconds

/**
 * A validation function for a number of seconds (mininum value 1).
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is a number of seconds.
 */
const isSeconds = makeNumber('second', 1);

/**
 * A validation function for a number of minutes (mininum value 1).
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is a number of minutes.
 */
const isMinutes = makeNumber('minute', 1);

/**
 * A validation function for a number of times (mininum value 1).
 * @memberof commands.validation
 * @param {object} e - Object to test.
 * @returns {boolean} If the input is a number of times.
 */
const isTimes = makeNumber('times', 1);

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  makeType,
  makeNumber,
  makeOptions,
  and,
  isIdentifier,
  isString,
  isCommand,
  isMs,
  isSeconds,
  isMinutes,
  isTimes
};
