//////////////////////////////////////////////////////////////////////////////
// Validation function factories
//////////////////////////////////////////////////////////////////////////////

const type = (t, b = t) => {
  const v = e => typeof e === b; // eslint-disable-line valid-typeof
  v.exp = v.type = t;
  v.base = b;
  return v;
};

const number = (t = 'number', min = null, max = null) => {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  const v = n => {
    if (typeof n !== 'number') return false;
    if (hasMin && n < min) return false;
    if (hasMax && n > max) return false;
    return true;
  };
  v.base = 'number';
  v.exp = v.type = t;
  if (hasMin || hasMax) v.exp += ` [${hasMin?min:'-∞'},${hasMax?max:'+∞'}]`;
  if (hasMin) v.min = min;
  if (hasMax) v.max = max;
  return v;
};

const options = (t, l) => {
  const v = e => l.indexOf(e) >= 0;
  v.base = typeof l[0]; // e.g. "string"
  v.exp = `"${l.join('" or "')}"`;
  v.type = t;
  v.options = l;
  return v;
};

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

const isIdentifier = s =>
  // A negative look behind to check for a string that does NOT end with a dash
  // is only supported on node 8.9.4 with the --harmony flag
  // https://node.green/#ES2018-features--RegExp-Lookbehind-Assertions
  // /^[a-z_][a-z_0-9-]*(?<!-)$/i
  /^[a-z_][a-z_0-9-]*$/i.test(s) && /[^-]$/.test(s);
isIdentifier.exp = 'identifier';

const isString = type('string');

const isCommand = type('command', 'function');

// time-based
const isMs = number('ms', 70); // arbitrary lower limit for milliseconds
const isSeconds = number('second', 1);
const isMinutes = number('minute', 1);

// number of times
const isTimes = number('times', 1);

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  type,
  number,
  options,
  and,
  isIdentifier,
  isString,
  isCommand,
  isMs,
  isSeconds,
  isMinutes,
  isTimes
};
