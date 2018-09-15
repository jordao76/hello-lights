(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

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
// Every command takes 2 parameters:
//   1. context = { cp, tl, ct, scope }
//   where
//      cp is the command parser (on demand)
//      tl is a traffic light
//      ct is a cancellation token
//      scope are the variable bindings for nested commands
//   2. params = [v1, v2, ..., vn]
//      v1...vn are the values of the command parameters
//////////////////////////////////////////////////////////////////////////////

let {Cancellable} = require('./cancellable');

// Default Cancellation Token used for all commands
let cancellable = new Cancellable;

// Cancels all commands that are being executed in the context of a
// Cancellation Token.
function cancel({ct = cancellable} = {}) {
  if (ct.isCancelled) return;
  ct.cancel();
  if (ct === cancellable) {
    cancellable = new Cancellable;
  }
}
cancel.paramNames = []; // no parameters
cancel.validation = []; // validates number of parameters (zero)
cancel.doc = {
  name: 'cancel',
  desc: 'Cancels all executing commands.'
};

//////////////////////////////////////////////////////////////////////////////

function define({cp}, [name, desc, command]) {
  return cp.define(name, command, desc);
}
define.doc = {
  name: 'define',
  desc: 'Defines a new command or redefines an existing one, where variables become parameters:\n' +
        '(define burst\n  "Burst of light: (burst red)"\n  (twinkle :light 70))\n\n(burst red)'
};
define.paramNames = ['name', 'desc', 'command'];
define.validation = [isIdentifier, isString, isCommand];
define.usesParser = true; // receives the cp (command parser) parameter

//////////////////////////////////////////////////////////////////////////////

// Pauses execution for the given duration.
// Returns a Promise that resolves when the pause duration is complete,
// or if it's cancelled. Even if the pause is cancelled, the Promise
// is resolved, never rejected.
function pause(ctx, params) {
  // allow the first parameter to be omitted
  // => pause({ct}, [500]) OR pause([500])
  let ct = ctx.ct || cancellable;
  if (ct.isCancelled) return;
  let [ms] = params || ctx;
  return new Promise(resolve => {
    let timeoutID = setTimeout(() => {
      ct.del(timeoutID);
      resolve();
    }, ms);
    ct.add(timeoutID, resolve);
  });
}
pause.paramNames = ['ms'];
pause.validation = [isPeriod];
pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration in milliseconds:\n' +
        '(pause 500)'
};

//////////////////////////////////////////////////////////////////////////////

// Executes a command with a timeout
async function timeout({tl, ct = cancellable, scope = {}}, [ms, command]) {
  let timeoutC = new Cancellable;
  let timeoutP = pause({ct}, [ms]);
  // race the cancellable-command against the timeout
  let res = await Promise.race([command({tl, ct: timeoutC, scope}), timeoutP]);
  // check if the timeout was reached
  // 42 is arbitrary, but it CAN'T be the value returned by timeoutP
  let value = await Promise.race([timeoutP, 42]);
  if (value !== 42 || ct.isCancelled) {
    // the timeout was reached (value !== 42) OR the timeout was cancelled
    timeoutC.cancel();
  }
  return res;
}
timeout.paramNames = ['ms', 'command'];
timeout.validation = [isPeriod, isCommand];
timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout:\n' +
        '(timeout 5000 (twinkle red 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function run({tl, ct = cancellable, scope = {}}, [commands]) {
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
    await command({tl, ct, scope});
  }
}
run.transformation = args => [args];
run.paramNames = ['commands'];
run.validation = [each(isCommand)];
run.doc = {
  name: 'run',
  desc: 'Executes the given commands in sequence:\n' +
        '(run\n  (toggle red)\n  (pause 1000)\n  (toggle red))'
};

//////////////////////////////////////////////////////////////////////////////

async function loop({tl, ct = cancellable, scope = {}}, [commands]) {
  if (!commands || commands.length === 0) return;
  while (true) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
loop.transformation = args => [args];
loop.paramNames = ['commands'];
loop.validation = [each(isCommand)];
loop.doc = {
  name: 'loop',
  desc: 'Executes the given commands in sequence, starting over forever:\n' +
        '(loop\n  (toggle green)\n  (pause 400)\n  (toggle red)\n  (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function repeat({tl, ct = cancellable, scope = {}}, [times, commands]) {
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await run({tl, ct, scope}, [commands]);
  }
}
repeat.transformation = args => [args[0], args.slice(1)];
repeat.paramNames = ['times', 'commands'];
repeat.validation = [isNumber, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times:\n' +
        '(repeat 5\n  (toggle green)\n  (pause 400)\n  (toggle red)\n  (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function all({tl, ct = cancellable, scope = {}}, [commands]) {
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({tl, ct, scope: {...scope}});
  }));
}
all.transformation = args => [args];
all.paramNames = ['commands'];
all.validation = [each(isCommand)];
all.doc = {
  name: 'all',
  desc: 'Executes the given commands in parallel, all at the same time:\n' +
        '(all\n  (twinkle green 700)\n  (twinkle yellow 300))'
};

//////////////////////////////////////////////////////////////////////////////
// Ease validation
//////////////////////////////////////////////////////////////////////////////

let Easing = {
  linear: t => t,
  easeIn: t => t*t,
  easeOut: t => t*(2-t),
  easeInOut: t => t<0.5 ? 2*t*t : -1+(4-2*t)*t
};

let isEasing = e => !!Easing[e];
isEasing.exp = `an easing function in ${Object.keys(Easing).join(', ')}`;

//////////////////////////////////////////////////////////////////////////////

async function ease({tl, ct = cancellable, scope = {}}, [easing, ms, what, from, to, command]) {
  let start = Date.now();
  let end = start + ms;
  let next = () => {
    let now = Date.now();
    let c = Easing[easing]((now - start) / ms);
    let curr = c * (to - from) + from;
    return curr | 0; // double -> int
  };
  // `[what]` is a "live" variable, so it's defined as a property
  Object.defineProperty(scope, what, {
    configurable: true, // allow the property to be deleted or redefined
    get: next,
    set: () => {} // no-op
  });
  while (true) {
    if (ct.isCancelled) break;
    let now = Date.now();
    let max = end - now;
    if (max <= 0) break;
    await timeout({tl, ct, scope}, [max, command]);
  }
}
ease.paramNames = ['easing', 'ms', 'what', 'from', 'to', 'command'];
ease.validation = [isEasing, isPeriod, isIdentifier, isNumber, isNumber, isCommand];
ease.doc = {
  name: 'ease',
  desc: 'Ease the `what` variable to `command`.\n' +
        'In the duration `ms`, go from `from` to `to` using the `easing` function:\n' +
        '(ease linear 10000 ms 50 200\n  (flash yellow :ms))'
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Traffic Light.
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////////////////////////////

let isOn = state =>
  (state === 'off' || state === 'false') ? false : !!state;

let turnLight = (oLight, state) =>
  oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

let isLight = l => l === 'red' || l === 'yellow' || l === 'green';
isLight.exp = '"red", "yellow" or "green"';

let isState = s => s === 'on' || s === 'off';
isState.exp = '"on" or "off"';

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct = cancellable}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.paramNames = ['light'];
toggle.validation = [isLight];
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light:\n(toggle green)'
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct = cancellable}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.paramNames = ['light', 'state'];
turn.validation = [isLight, isState];
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off:\n' +
        '(turn green on)'
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct = cancellable}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.paramNames = []; // no parameters
reset.validation = []; // validates number of parameters (zero)
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off.'
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  // base commands
  cancel, define,
  pause, timeout,
  run, loop, repeat, all, ease,
  // base traffic light commands
  toggle, turn, reset
};

},{"./cancellable":2}],2:[function(require,module,exports){
/**
 * A Cancellation Token (ct) that commands can check for cancellation.
 * Commands should regularly check for the {@link Cancellable#isCancelled}
 * attribute and exit eagerly if true.
 * Keeps a list of timeout IDs issued by {@link setTimeout} calls and cancels
 * them all when {@link Cancellable#cancel} is called, setting the
 * {@link Cancellable#isCancelled} attribute to true.
 */
class Cancellable {

  /** Cancellable constructor. */
  constructor() {
    /** If the Cancellation Token is cancelled. Starts of as false. */
    this.isCancelled = false;
    // Object storing timeout IDs and related Promise resolve functions.
    this._timeoutIDs = {};
  }

  /**
   * Registers the given timeout ID and {@link Promise} resolve function.
   * @package
   * @param timeoutID - Timeout ID, the result of calling
   *   {@link setTimeout}, platform dependent.
   * @param {function} resolve - Resolve function for a {@link Promise} to be
   *   called if the timeout is cancelled.
   */
  add(timeoutID, resolve) {
    this._timeoutIDs[timeoutID.id||timeoutID] = [timeoutID, resolve];
  }

  /**
   * Unregisters the given timeout ID, when the timeout is reached and
   * does not need to be cancelled anymore, or if it was cancelled.
   * @package
   * @param timeoutID - Timeout ID to unregister.
   */
  del(timeoutID) {
    delete this._timeoutIDs[timeoutID.id||timeoutID];
  }

  /**
   * Cancels all registered timeouts. Sets {@link Cancellable#isCancelled} to true.
   * Cancellation means calling {@link clearTimeout} with the stored timeout IDs and
   * calling the related resolve functions.
   */
  cancel() {
    this.isCancelled = true;
    for (let [, [timeoutID, resolve]] of Object.entries(this._timeoutIDs)) {
      this.del(timeoutID);
      clearTimeout(timeoutID);
      resolve();
    }
  }

}

module.exports = {Cancellable};

},{}],3:[function(require,module,exports){
let baseCommands = require('./base-commands');
let {Cancellable} = require('./cancellable');
let parser = require('./command-peg-parser');

//////////////////////////////////////////////////////////////////////////////

/** Parses and executes commands on a traffic light. */
class CommandParser {

  /**
   * @param {object} [commands] - Commands this parser recognizes.
   */
  constructor(commands = baseCommands) {
    // clone base commands
    this.commands = commands === baseCommands ? {...commands} : commands;
    this.ct = new Cancellable;
  }

  /**
   * Command names this parser recognizes.
   * @type {string[]}
   */
  get commandList() {
    return Object.keys(this.commands);
  }

  /**
   * Cancels any executing commands.
   * @param {Cancellable} [ct] - Cancellation token.
   */
  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable;
    }
  }

  /**
   * Executes a command.
   * @param {string} commandStr - Command string to execute.
   * @param {TrafficLight} tl - Traffic light to use.
   * @param {Cancellable} [ct] - Cancellation token.
   * @param {object} [scope] - Scope for variables in the command.
   */
  async execute(commandStr, tl, ct = this.ct, scope = {}) {
    if (ct.isCancelled) return;
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let res;
    for (let i = 0; i < asts.length; ++i) {
      let command = generator.execute(asts[i]);
      res = await command({tl, ct, scope});
    }
    if (ct === this.ct && ct.isCancelled) {
      // the command 'cancel' was executed on this.ct, so re-instantiate it
      this.ct = new Cancellable;
    }
    return res; // returns the last execution result
  }

  /**
   * Parses a command string.
   * @package
   * @param {string} commandStr - Command string to execute.
   * @returns {(function|function[])} One or many traffic light commands.
   */
  parse(commandStr) {
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let commands = asts.map(ast => generator.execute(ast));
    if (commands.length === 1) return commands[0];
    return commands;
  }

  /**
   * Defines a new command or redefines an existing one.
   * @param {string} name - Command name.
   * @param {function} command - A traffic light command.
   * @param {string} [desc] - Command description.
   * @returns {function} The newly defined command.
   */
  define(name, command, desc = '') {
    let paramNames = command.paramNames || [];
    let newCommand = ({tl, ct, scope = {}}, params = []) => {
      Validator.validate(newCommand, params);
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({tl, ct, scope});
    };
    newCommand.doc = {name, desc};
    newCommand.paramNames = paramNames;
    newCommand.toString = () => `'${name}' command`;
    return this.commands[name] = newCommand;
  }

}

//////////////////////////////////////////////////////////////////////////////

let isVar = (a) => typeof a === 'string' && a.startsWith(':');
let getName = (v) => v.replace(/^:/, '');

class Vars {
  constructor(args) {
    this.args = args;
  }
  resolve(scope) {
    return this.args.map(a =>
      isVar(a) ? scope[getName(a)] : a
    );
  }
}

//////////////////////////////////////////////////////////////////////////////

class Generator {

  constructor(parser) {
    this.parser = parser;
    this.commands = parser.commands;
  }

  execute(ast) {
    this.variables = [];
    this.errors = [];
    let res = this.recur(ast);
    Validator.raiseIf(this.errors);
    return res;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // get the command components: its name and its arguments
    let commandName = node.name;
    let args = node.params;

    // collect errors
    let errors;

    // recurse on parameters
    args = args.map(a => this.recur(a));

    // get the command
    let command = this.commands[commandName];
    if (command) {
      // transform the command arguments
      args = this._transform(command, args);

      // validate the command arguments
      errors = Validator.collect(command, args);
    } else {
      // invalid command
      errors = [`Command not found: "${commandName}"`];
    }

    // check for errors
    if (errors.length > 0) {
      this.errors.push(...errors);
      return;
    }

    // return a command that takes (in an object) a traffic light (tl),
    // a cancellation token (ct) and an optional scope with variable bindings
    let vars = new Vars(args);
    let res = ({tl, ct, scope={}}) => {
      let ctx = {tl, ct, scope};
      if (command.usesParser) ctx.cp = this.parser; // cp = command-parser
      let params = vars.resolve(scope);
      Validator.validate(command, params);
      return command(ctx, params);
    };
    // note: these are ALL the variables collected so far,
    // not only the ones relevant for this command
    // e.g. (run (toggle :l1) (pause :ms) (toggle :l2))
    //   'pause' will have [l1, ms]
    //   the second 'toggle' will have [l1, ms, l2]
    res.paramNames = this.variables; // variables become parameter names
    res.toString = () => `'${commandName}' command`;
    return res;
  }

  variable(node) {
    if (this.variables.indexOf(node.name) < 0) {
      this.variables.push(node.name);
    }
    return ':' + node.name;
  }

  value(node) {
    return node.value;
  }

  _transform(command, args) {
    if (command.transformation) {
      return command.transformation(args);
    }
    return args;
  }

};

//////////////////////////////////////////////////////////////////////////////

let Validator = {

  validate(command, args) {
    let errors = this.collect(command, args);
    this.raiseIf(errors);
  },

  raiseIf(errors) {
    if (errors.length > 0) throw new Error(errors.join('\n'));
  },

  collect(command, args) {
    let badArity = (exp, act) =>
      `Bad number of arguments to "${commandName}"; it takes ${exp} but was given ${act}`;
    let badValue = (i) => {
      if (args[i] === undefined) return null;
      return `Bad value "${args[i]}" to "${commandName}" parameter ${i+1} ("${pns[i]}"); must be: ${vfs[i].exp}`;
    };

    let commandName = command.doc ? command.doc.name : command.name;
    let pns = command.paramNames; // pns = Parameter NameS
    let es = []; // es = ErrorS

    if (pns.length !== args.length) {
      es.push(badArity(pns.length, args.length));
    }

    let vfs = command.validation || []; // vfs = Validation FunctionS
    let argsErrors = vfs
      .map((isValid, i) => args.length <= i || isVar(args[i]) || isValid(args[i]) ? null : badValue(i))
      .filter(e => e); // filter out 'null', where the validation was successful
    es.push(...argsErrors);
    return es;
  }

};

module.exports = {CommandParser};

},{"./base-commands":1,"./cancellable":2,"./command-peg-parser":4}],4:[function(require,module,exports){
/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

"use strict";

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { Start: peg$parseStart },
      peg$startRuleFunction  = peg$parseStart,

      peg$c0 = function(command) { return [command]; },
      peg$c1 = "(",
      peg$c2 = peg$literalExpectation("(", false),
      peg$c3 = ")",
      peg$c4 = peg$literalExpectation(")", false),
      peg$c5 = function(first, rest) {
          return [first, ...(rest || [])];
        },
      peg$c6 = function(name, params) {
          return { type: 'command', name, params: params || [] };
        },
      peg$c7 = function(head, tail) { return [head, ...(tail || [])]; },
      peg$c8 = function(name) { return { type: 'variable', name }; },
      peg$c9 = function(value) { return { type: 'value', value }; },
      peg$c10 = function(command) { return command; },
      peg$c11 = ":",
      peg$c12 = peg$literalExpectation(":", false),
      peg$c13 = function(name) { return name; },
      peg$c14 = /^[a-z_]/i,
      peg$c15 = peg$classExpectation([["a", "z"], "_"], false, true),
      peg$c16 = /^[a-z_0-9\-]/i,
      peg$c17 = peg$classExpectation([["a", "z"], "_", ["0", "9"], "-"], false, true),
      peg$c18 = function(head, tail) { return head + (tail || []).join(''); },
      peg$c19 = /^[0-9]/,
      peg$c20 = peg$classExpectation([["0", "9"]], false, false),
      peg$c21 = function(digits) { return parseInt(digits.join(''), 10); },
      peg$c22 = "\"",
      peg$c23 = peg$literalExpectation("\"", false),
      peg$c24 = /^[^"]/,
      peg$c25 = peg$classExpectation(["\""], true, false),
      peg$c26 = function(contents) { return (contents || []).join(''); },
      peg$c27 = /^[ \t\r\n]/,
      peg$c28 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false),
      peg$c29 = ";",
      peg$c30 = peg$literalExpectation(";", false),
      peg$c31 = /^[^\r\n]/,
      peg$c32 = peg$classExpectation(["\r", "\n"], true, false),
      peg$c33 = /^[\r\n]/,
      peg$c34 = peg$classExpectation(["\r", "\n"], false, false),
      peg$c35 = peg$anyExpectation(),

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parseStart() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseCommand();
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c0(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseCommands();
    }

    return s0;
  }

  function peg$parseCommands() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c1;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c2); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseCommand();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s6 = peg$c3;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c4); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseCommands();
                  if (s8 === peg$FAILED) {
                    s8 = null;
                  }
                  if (s8 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c5(s4, s8);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseCommand() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseIdentifier();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseParameters();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c6(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseParameters() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseParameter();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseParameters();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c7(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseParameter() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseVariable();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c8(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseIdentifier();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c9(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseNumber();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c9(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseString();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c9(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 40) {
              s1 = peg$c1;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c2); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseCommand();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s5 = peg$c3;
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c4); }
                    }
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c10(s3);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseVariable() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 58) {
      s1 = peg$c11;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c12); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseIdentifier();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c13(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseIdentifier() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (peg$c14.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c15); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$c16.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$c16.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c18(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseNumber() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c19.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c20); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c19.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c21(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseString() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c22;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c23); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$c24.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$c24.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c25); }
        }
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s3 = peg$c22;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c23); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c26(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    s0 = [];
    s1 = peg$parseFiller();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parseFiller();
    }

    return s0;
  }

  function peg$parseFiller() {
    var s0, s1, s2, s3;

    if (peg$c27.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c28); }
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c29;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c31.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c31.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c33.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 59) {
          s1 = peg$c29;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c30); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c31.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c31.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c32); }
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseEOF();
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parseEOF() {
    var s0, s1;

    s0 = peg$currPos;
    peg$silentFails++;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c35); }
    }
    peg$silentFails--;
    if (s1 === peg$FAILED) {
      s0 = void 0;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

module.exports = {
  SyntaxError: peg$SyntaxError,
  parse:       peg$parse
};

},{}],5:[function(require,module,exports){
; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(cp) { cp.execute(`
;---------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  (lights off off on)"
  (run
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);cp.execute(`;-----------------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  (flash red 500)"
  (run
    (toggle :light) (pause :ms)
    (toggle :light) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define blink
  "Flashes a light for the given number of times and duration for each time:
  (blink 10 yellow 500)"
  (repeat :times
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define twinkle
  "Flashes a light for the given duration forever:
  (twinkle green 500)"
  (loop
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define cycle
  "Blinks each light in turn for the given duration and number of times,
  repeating forever; starts with red:
  (cycle 2 500)"
  (loop
    (blink :times red    :ms)
    (blink :times yellow :ms)
    (blink :times green  :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define jointly
  "Flashes all lights together forever:
  (jointly 500)"
  (loop
    (lights on  on  on)  (pause :ms)
    (lights off off off) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define heartbeat
  "Heartbeat pattern: (heartbeat red)"
  (loop
    (blink 2 :light 250)
    (pause 350)))

;`);cp.execute(`;-----------------------------------------------------------

(define pulse
  "Single pulse pattern: (pulse red)"
  (loop
    (toggle :light)
    (pause 300)
    (toggle :light)
    (pause 1500)))

;`);cp.execute(`;-----------------------------------------------------------

(define count
  "Count a number of times repeatedly: (count 7 red)"
  (loop
    (blink :times :light 200)
    (pause 800)))

;`);cp.execute(`;-----------------------------------------------------------

(define sos
  "SOS distress signal morse code pattern:
  (sos red)"
  (loop
    (blink 3 :light 150)
    (blink 2 :light 250)
    (toggle :light)
    (pause 250)
    (toggle :light)
    (pause 150)
    (blink 3 :light 150)
    (pause 700)))

;`);cp.execute(`;-----------------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);cp.execute(`;-----------------------------------------------------------

(define up
  "Go up with the given duration:
  (up 200)"
  (run
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);cp.execute(`;-----------------------------------------------------------

(define down
  "Go down with the given duration:
  (down 200)"
  (run
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle green)  (pause :ms) (toggle green)))

;`);cp.execute(`;-----------------------------------------------------------

(define bounce
  "Bounce with the given duration:
  (bounce 500)"
  (loop
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)))

;`);cp.execute(`;-----------------------------------------------------------

(define soundbar
  "Like a sound bar with the given duration:
  (soundbar 500)"
  (loop
    (toggle green)  (pause :ms)
    (toggle yellow) (pause :ms)
    (toggle red)    (pause :ms)
    (toggle red)    (pause :ms)
    (toggle yellow) (pause :ms)
    (toggle green)  (pause :ms)))

;`); }//--------------------------------------------------------------------

},{}],6:[function(require,module,exports){
///////////////////////////////////////////////////////////////////

/** A Light in a traffic light. */
class Light {

  constructor() {
    /** If the light is on.
     * @type {boolean} */
    this.on = false;
  }

  /**
   * If the light is off.
   * @type {boolean}
   */
  get off() { return !this.on; }

  /** Toggles the light. */
  toggle() { this.on = !this.on; }

  /** Turns the light on. */
  turnOn() { this.on = true; }

  /** Turns the light off. */
  turnOff() { this.on = false; }
}

///////////////////////////////////////////////////////////////////

/** A Traffic Light with red, yellow and green lights. */
class TrafficLight {

  /**
   * @param {Light} [red] - Red light.
   * @param {Light} [yellow] - Yellow light.
   * @param {Light} [green] - Green light.
   */
  constructor(red, yellow, green) {
    /** The red light.
      * @type {Light}  */
    this.red = red || new Light;
    /** The yellow light.
     * @type {Light}  */
    this.yellow = yellow || new Light;
    /** The green light.
     * @type {Light}  */
    this.green = green || new Light;
  }

  /** Sets all lights to off. */
  reset() {
    this.red.turnOff();
    this.yellow.turnOff();
    this.green.turnOff();
  }

}

///////////////////////////////////////////////////////////////////

module.exports = {
  Light, TrafficLight
};

},{}],7:[function(require,module,exports){
var trafficlight = require('../src/traffic-light.js');
var {CommandParser} = require('../src/command-parser.js');
let defineCommands = require('../src/traffic-light-commands.cljs');

///////////////

class WebLight extends trafficlight.Light {
  constructor(selector) {
    super();
    this.elLight = document.querySelector(selector);
    this.elLight.addEventListener('click', () => this.toggle());
  }
  toggle() {
    super.toggle();
    this.elLight.classList.toggle('on');
  }
  turnOn() {
    super.turnOn();
    this.elLight.classList.add('on');
  }
  turnOff() {
    super.turnOff();
    this.elLight.classList.remove('on');
  }
}

///////////////

function info(str) {
  console.log(str);
}

function error(str) {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = str;
  divError.style.display = '';
  console.error(str);
}

function clearError() {
  let divError = document.querySelector('.error');
  let spanError = document.querySelector('#error');
  spanError.innerText = '';
  divError.style.display = 'none';
}

///////////////

var cp = new CommandParser(); defineCommands(cp);

///////////////

async function execute(commandStr) {
  clearError();
  info(`Executing command '${commandStr}'`);
  cp.cancel();
  await cp.execute('reset', window.tl);
  try {
    if (commandStr.match(/define/)) {
      setTimeout(showHelp, 0);
    }
    await cp.execute(commandStr, window.tl);
    info(`Finished command '${commandStr}'`);
  } catch (e) {
    error(`Error executing command.\n${e}`);
  }
};

///////////////

function showHelp() {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  for (let i = 0; i < cp.commandList.length; ++i) {
    let commandName = cp.commandList[i];
    let command = cp.commands[commandName];
    let usage = (c) => `<h3><code>${c.doc.name} ${c.paramNames.map(n => ':'+n).join(' ')}</code></h3>`;
    divHelp.innerHTML += [
      usage(command),
      command.doc.desc
        .replace(/:(\s*\(.+\)\s*)$/s,
          (_, sample) => {
            sample = sample.trim().replace(/\n {2}/g, '\n&nbsp;&nbsp;'); // indentation
            return `:<br /><br /><div class="sample">${sample}</div>`;
          }
        )
        .replace(/\n/g, '<br />\n')
    ].join('');
  }
  setUpSamples();
};

///////////////

function setUpButtons() {
  let txtCommand = document.querySelector('#command');
  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => execute(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => cp.cancel());

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => execute('reset'));
}

///////////////

function setUpSamples() {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.innerHTML
        .replace(/<br\s*\/?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim());
      location.hash = '#_';
    }));
}

///////////////

async function runCommand(command) {
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  await execute(command);
}

///////////////

function setUpTrafficLight() {
  var r = new WebLight('#tl > .red');
  var y = new WebLight('#tl > .yellow');
  var g = new WebLight('#tl > .green');
  window.tl = new trafficlight.TrafficLight(r, y, g);
}

///////////////

async function main() {
  setUpTrafficLight();
  showHelp();
  setUpButtons();
  runCommand(`
    loop
      (up 70)
      (pause 500)
      (down 70)
      (pause 500)
  `.trim().replace(/^\s{4}/gm, '')); // trim per-line indentation
}

///////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}

},{"../src/command-parser.js":3,"../src/traffic-light-commands.cljs":5,"../src/traffic-light.js":6}]},{},[7]);
