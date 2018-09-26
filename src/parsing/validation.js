//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

// A negative look behind to check for a string that does NOT end with a dash
// is only supported on node 8.9.4 with the --harmony flag
// https://node.green/#ES2018-features--RegExp-Lookbehind-Assertions
// /^[a-z_][a-z_0-9-]*(?<!-)$/i
let isIdentifier = s =>
  /^[a-z_][a-z_0-9-]*$/i.test(s) && /[^-]$/.test(s);
isIdentifier.exp = 'a valid identifier';

let isString = s => typeof s === 'string';
isString.exp = 'a string';

let isNumber = n => typeof n === 'number';
isNumber.exp = 'a number';
let isPeriod = isNumber;

let isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

let each = vf => {
  let v = a => Array.isArray(a) && a.every(e => vf(e));
  v.exp = `each is ${vf.exp}`;
  return v;
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  isIdentifier,
  isString,
  isNumber,
  isPeriod,
  isCommand,
  each
};
