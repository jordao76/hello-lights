//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

// A negative look behind to check for a string that does NOT end with a dash
// is only supported on node 8.9.4 with the --harmony flag
// https://node.green/#ES2018-features--RegExp-Lookbehind-Assertions
// /^[a-z_][a-z_0-9-]*(?<!-)$/i
const isIdentifier = s =>
  /^[a-z_][a-z_0-9-]*$/i.test(s) && /[^-]$/.test(s);
isIdentifier.exp = 'a valid identifier';

const isString = s => typeof s === 'string';
isString.exp = 'a string';

const isNumber = n => typeof n === 'number';
isNumber.exp = 'a number';

const isGreaterThan = n => {
  let v = x => isNumber(x) && x > n;
  v.exp = `a number (> ${n})`;
  return v;
}

const isGreaterThanZero = isGreaterThan(0);

const isPeriod = isGreaterThanZero;

const isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

const each = vf => {
  let v = a => Array.isArray(a) && a.length > 0 && a.every(e => vf(e));
  v.exp = `each is ${vf.exp} (and at least 1)`;
  return v;
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  isIdentifier,
  isString,
  isNumber,
  isGreaterThan,
  isGreaterThanZero,
  isPeriod,
  isCommand,
  each
};
