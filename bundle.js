(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
////////////////////////////////////////////////

const tryRequire = (path) => {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
};

////////////////////////////////////////////////

// The default Selector constructor.
// This is an optional requirement since when used in a web context
// it would fail because of further USB-related dependencies.
// Browserify won't pick it up since the `require` call is encapsulated in
// `tryRequire`.
// If SelectorCtor is null, then it's a mandatory option to the Commander ctor.
const {SelectorCtor} = tryRequire('./selectors/physical-traffic-light-selector');

////////////////////////////////////////////////

const {Interpreter} = require('./commands/interpreter');
const {defineCommands} = require('./traffic-light/traffic-light-commands'); // TODO: put this in a base TrafficLightSelector class
// the default command interpreter
const DefaultInterpreter = new Interpreter();
defineCommands(DefaultInterpreter);

////////////////////////////////////////////////

/**
 * Issues commands to control a traffic light.
 */
class Commander {

  /**
   * Creates a new Commander instance.
   * @param {object} [options] - Commander options.
   * @param {object} [options.logger=console] - A Console-like object for logging,
   *   with a log and an error function.
   * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
   * @param {object} [options.selector] - The traffic light selector to use.
   *   Takes precedence over `options.selectorCtor`.
   * @param {function} [options.selectorCtor] - The constructor of a traffic
   *   light selector to use. Will be passed the entire `options` object.
   *   Ignored if `options.selector` is set.
   * @param {physical.DeviceManager} [options.manager] - The Device Manager to use.
   *   This is an option for the default `options.selectorCtor`.
   * @param {string|number} [options.serialNum] - The serial number of the
   *   traffic light to use, if available. Cleware USB traffic lights have
   *   a numeric serial number.
   *   This is an option for the default `options.selectorCtor`.
   */
  constructor(options = {}) {
    let {
      logger = console,
      interpreter = DefaultInterpreter,
      selector = null,
      selectorCtor = SelectorCtor
    } = options;
    this.logger = logger;
    this.interpreter = interpreter;

    this.selector = selector || new selectorCtor({...options, logger, interpreter}); // eslint-disable-line new-cap
    this.selector.on('enabled', () => this._resumeIfNeeded());
    this.selector.on('disabled', () => this.cancel());
    this.selector.on('interrupted', () => this._interrupt());
  }

  /**
   * Called to close this instance.
   * Should be done as the last operation before exiting the process.
   */
  close() {
    this.selector.close();
  }

  /**
   * Cancels any currently executing command.
   */
  cancel() {
    this.interpreter.cancel();
  }

  _interrupt() {
    if (!this.running) return;
    this.isInterrupted = true;
    this.interpreter.cancel();
  }

  /**
   * Executes a command asynchronously.
   * If the same command is already running, does nothing.
   * If another command is running, cancels it, resets the traffic light,
   * and runs the new command.
   * If no command is running, executes the given command, optionally
   * resetting the traffic light based on the `reset` parameter.
   * If there's no traffic light to run the command, stores it for later when
   * one becomes available. Logs messages appropriately.
   * @param {string} command - Command to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light
   *   before executing the command.
   */
  async run(command, reset = false) {
    let tl = this.selector.resolveTrafficLight();
    if (!tl) {
      this.suspended = command;
      this.logger.log(`no traffic light available to run '${command}'`);
      return;
    }
    try {
      if (this._skipIfRunningSame(command, tl)) return;
      await this._cancelIfRunningDifferent(command, tl);
      return await this._execute(command, tl, reset);
    } catch (e) {
      this._errorInExecution(command, tl, e);
    }
  }

  async _cancelIfRunningDifferent(command, tl) {
    if (!this.running || this.running === command) return;
    this.logger.log(`${tl}: cancel '${this.running}'`);
    this.interpreter.cancel();
    await tl.reset();
  }

  _skipIfRunningSame(command, tl) {
    if (this.running !== command) return false;
    this.logger.log(`${tl}: skip '${command}'`);
    return true;
  }

  async _execute(command, tl, reset) {
    if (reset) await tl.reset();
    this.logger.log(`${tl}: running '${command}'`);
    this.running = command;
    let res = await this.interpreter.execute(command, {tl});
    if (command === this.running) this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    if (this.isInterrupted || !tl.isEnabled) {
      let state = this.isInterrupted ? 'interrupted' : 'disabled';
      this.logger.log(`${tl}: ${state}, suspending '${command}'`);
      this.suspended = command;
      this.isInterrupted = false;
      this._resumeIfNeeded(); // try to resume in another traffic light
    } else {
      this.suspended = null;
      this.logger.log(`${tl}: finished '${command}'`);
    }
  }

  _errorInExecution(command, tl, error) {
    if (command === this.running) this.running = null;
    this.logger.error(`${tl}: error in '${command}'`);
    this.logger.error(error.message);
  }

  _resumeIfNeeded() {
    let command = this.suspended;
    if (!command) return;
    this.suspended = null;
    this.run(command, true); // no await
  }

  /**
   * All supported command names.
   * @type {string[]}
   */
  get commandNames() {
    return this.interpreter.commandNames;
  }

  /**
   * All supported commands indexed by their names.
   * @type {object.<string, commands.Command>}
   */
  get commands() {
    return this.interpreter.commands;
  }

  /**
   * Logs the help info for the given command name.
   * @param {string} commandName - Name of the command to log help info.
   */
  help(commandName) {
    let command = this.interpreter.commands[commandName];
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    const validationText = p => p.validate ? ` (${p.validate.exp})` : '';
    let params = command.meta.params.map(p => ':' + p.name + validationText(p)).join(' ');
    if (params.length > 0) params = ' ' + params;
    this.logger.log(`${command.meta.name}${params}`);
    this.logger.log(command.meta.desc);
  }

  /**
   * Logs information about known traffic lights.
   */
  logInfo() {
    this.selector.logInfo(this.logger);
  }

}

////////////////////////////////////////////////

/**
 * Factory for a Commander that deals with multiple traffic lights.
 * It will greedily get all available traffic lights for use and add commands
 * to deal with multiple traffic lights.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @returns {Commander} A multi-traffic-light commander.
 */
Commander.multi = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-multi-traffic-light-selector');
  let {selectorCtor = SelectorCtor} = options;
  return new Commander({...options, selectorCtor});
};

////////////////////////////////////////////////

module.exports = {Commander};

},{"./commands/interpreter":8,"./traffic-light/traffic-light-commands":16}],3:[function(require,module,exports){
const {and} = require('./validation');

/////////////////////////////////////////////////////////////////////////////

class Analyzer {

  constructor(commands) {
    this.commands = commands;
  }

  analyze(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      this.root = node;
      this.params = [];
      return this.recur(node);
    }).filter(node => !!node); // macros can remove the node by returning null
    delete this.params;
    delete this.root;
    if (nodes.length === 0) return null;
    return nodes;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // recurse on the command arguments
    node.args = node.args
      .map(arg => this.recur(arg))
      .filter(arg => !!arg); // macros can remove the node by returning null

    // validate the command node
    let errors = new Validator(this.commands, this.params).validate(node);
    this.errors.push(...errors);

    if (node === this.root) {
      node.params = this.params;
    }
    // check and run if it's a macro
    if (errors.length === 0 && node.value.meta.isMacro) {
      return this.runMacro(node);
    }

    return node;
  }

  runMacro(node) {
    let macro = node.value;
    let res = macro({
      root: this.root,
      node: node,
      commands: this.commands
    });
    if (res) {
      if (Array.isArray(res) && isError(res[0])) {
        // multiple errors
        this.errors.push(...res);
        return node;
      }
      if (isError(res)) {
        // single error
        this.errors.push(res);
        return node;
      }
    }
    return res;
  }

  value(node) {
    return node;
  }

  variable(node) {
    let param = this.params.find(p => p.name === node.name);
    if (!param) {
      this.params.push({
        type: 'param',
        name: node.name,
        uses: [node.loc] // uses: places where the param is used
      });
    } else {
      param.uses.push(node.loc);
    }
    return node;
  }

}

/////////////////////////////////////////////////////////////////////////////

class Validator {

  constructor(commands, params) {
    this.commands = commands;
    this.params = params;
  }

  validate(node) {
    let name = node.name;

    let command = this.commands[name];
    if (!command) return [badCommand(name, node.loc)];
    node.value = command;

    let args = node.args;
    let params = command.meta.params;
    let errors = [];

    // check arity
    let hasRest = params.length > 0 && params[params.length - 1].isRest;
    if ((!hasRest && params.length !== args.length) || (hasRest && params.length > args.length)) {
      errors.push(badArity(name, params.length, args.length, node.loc));
    }

    // check arguments against the parameters
    errors.push(...this._validateArgs(node, args, params));

    return errors;
  }

  _validateArgs(node, args, params) {
    let argGroups = params
      .slice(0, args.length) // only parameters for which there are arguments
      .map((param, i) => param.isRest ? args.slice(i) : [args[i]]); // group arguments per parameter
    let errors = argGroups
      .map((group, i) => group
        .map(arg => this._validateArg(node, arg, params[i], i)) // validate each argument group
        .filter(e => !!e)) // only keep validation errors (non null)
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    return errors;
  }

  _validateArg(node, arg, param, paramIdx) {
    arg.param = param.name;
    if (isVar(arg)) {
      this._combine(arg.name, param.validate);
    } else {
      if (isCommand(arg) && !node.value.meta.isMacro && arg.value.meta.returns === param.validate) {
        // no error since the argument is a command that returns
        // a conforming value to the parameter validation function
        // (they are the same validation function)
        // (only if the command is not a macro)
        return null;
      }
      if (!param.validate(arg.value)) {
        return badValue(node, paramIdx, arg);
      }
    }
  }

  _combine(paramName, validate) {
    let param = this.params.find(p => p.name === paramName); // global param
    param.validate = param.validate ? and(param.validate, validate) : validate;
  }

}

/////////////////////////////////////////////////////////////////////////////
// Errors
/////////////////////////////////////////////////////////////////////////////

const isVar = node => node.type === 'variable';
const isError = node => node.type === 'error';
const isCommand = node => node.type === 'command';

const badCommand = (name, loc) => ({
  type: 'error', loc,
  text: `Command not found: "${name}"`
});

const badArity = (name, exp, act, loc) => ({
  type: 'error', loc,
  text: `Bad number of arguments to "${name}": it takes ${exp} but was given ${act}`
});

const badValue = (node, paramIdx, arg) => {
  let param = node.value.meta.params[paramIdx];
  let text = isCommand(arg)
    ? `Bad call to "${arg.name}" for "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`
    : `Bad value "${arg.value}" to "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`;
  return { type: 'error', loc: arg.loc, text };
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {Analyzer};

},{"./validation":11}],4:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

const {
  isNumber,
  isCommand
} = require('./validation');

//////////////////////////////////////////////////////////////////////////////
// Base commands
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
cancel.meta = {
  name: 'cancel',
  params: [],
  desc: 'Cancels all executing commands.'
};

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
pause.meta = {
  name: 'pause',
  params: [{ name: 'ms', validate: isNumber }],
  desc: `Pauses execution for the given duration in milliseconds.`
};

//////////////////////////////////////////////////////////////////////////////

// Executes a command with a timeout
async function timeout(ctx, [ms, command]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
  let timeoutC = new Cancellable;
  let timeoutP = pause({ct}, [ms]);
  // race the cancellable-command against the timeout
  let res = await Promise.race([command({...ctx, ct: timeoutC, scope}), timeoutP]);
  // check if the timeout was reached
  let racer = {}; // arbitrary object to race against the timeout
  let value = await Promise.race([timeoutP, racer]);
  if (value !== racer || ct.isCancelled) {
    // the timeout was reached (value !== racer) OR the timeout was cancelled
    timeoutC.cancel();
  }
  return res;
}
timeout.meta = {
  name: 'timeout',
  params: [
    { name: 'ms', validate: isNumber },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Executes a command with a timeout.
    @example
    (timeout 5000 (twinkle red 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function $do(ctx, [...commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
    await command({...ctx, ct, scope});
  }
}
$do.meta = {
  name: 'do',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in sequence.
    @example
    (do
      (toggle red)
      (pause 1000)
      (toggle red))`
};

//////////////////////////////////////////////////////////////////////////////

async function loop(ctx, params) {
  let {ct = cancellable, scope = {}} = ctx;
  while (true) {
    if (ct.isCancelled) return;
    await $do({...ctx, ct, scope}, params);
  }
}
loop.meta = {
  name: 'loop',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in sequence, starting over forever.
    @example
    (loop
      (toggle green)
      (pause 400)
      (toggle red)
      (pause 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function repeat(ctx, [times, ...commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await $do({...ctx, ct, scope}, [...commands]);
  }
}
repeat.meta = {
  name: 'repeat',
  params: [
    { name: 'times', validate: isNumber },
    { name: 'command', validate: isCommand, isRest: true }
  ],
  desc: `
    Executes the commands in sequence, repeating the given number of times.
    @example
    (repeat 5
      (toggle green)
      (pause 400)
      (toggle red)
      (pause 400))`
};

//////////////////////////////////////////////////////////////////////////////

async function all(ctx, [...commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({...ctx, ct, scope: {...scope}});
  }));
}
all.meta = {
  name: 'all',
  params: [{ name: 'command', validate: isCommand, isRest: true }],
  desc: `
    Executes the given commands in parallel, all at the same time.
    @example
    (all
      (twinkle green 700)
      (twinkle yellow 300))`
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const commands = {
  cancel,
  pause,
  timeout,
  'do': $do,
  loop,
  repeat,
  all
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////

},{"./cancellable":5,"./validation":11}],5:[function(require,module,exports){
/**
 * A Cancellation Token (ct) that commands can check for cancellation.
 * Commands should regularly check for the
 * {@link commands.Cancellable#isCancelled|isCancelled}
 * attribute and exit eagerly if true.
 * Keeps a list of timeout IDs issued by
 * {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout|setTimeout}
 * calls and cancels them all when {@link commands.Cancellable#cancel|cancel} is called,
 * setting the {@link commands.Cancellable#isCancelled|isCancelled} attribute to true.
 * @memberof commands
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
   * Registers the given timeout ID and
   * {@link https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises|Promise}
   * resolve function.
   * @package
   * @param timeoutID - Timeout ID, the result of calling
   *   {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout|setTimeout},
   *   platform dependent.
   * @param {function} resolve - Resolve function for a Promise to be called
   *   if the timeout is cancelled.
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
   * Cancels all registered timeouts. Sets {@link commands.Cancellable#isCancelled|isCancelled} to true.
   * Cancellation means calling {@link https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout|clearTimeout}
   * with the stored timeout IDs and calling the related resolve functions.
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

},{}],6:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isString, isCommand} = require('./validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function define({root, node, commands}) {
  return exec({root, node, commands, descIdx: 1, commandIdx: 2});
}

function def({root, node, commands}) {
  return exec({root, node, commands, descIdx: 0, commandIdx: 1});
}

function exec({root, node, commands, descIdx, commandIdx}) {
  let errors = validate(node, root, descIdx);
  if (errors.length > 0) return errors;

  let name = node.args[0].value;
  let desc = node.args[descIdx].value;
  let commandNode = node.args[commandIdx];
  let params = node.params;

  let [command] = new Generator().generate([commandNode]);
  let res = (ctx, args) => {
    let {scope = {}} = ctx;
    params.forEach((param, i) => scope[param.name] = args[i]);
    return command({...ctx, scope});
  };

  commands[name] = res;

  res.meta = { name, desc, params };
  if (commandNode.type === 'command') {
    res.meta.returns = commandNode.value.meta.returns;
  }

  return null;
}

/////////////////////////////////////////////////////////////////////////////

define.meta = {
  name: 'define',
  isMacro: true,
  params: [
    { name: 'name', validate: isIdentifier },
    { name: 'description', validate: isString },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Defines a new command or redefines an existing one,
    where variables (identifiers starting with :) become parameters.
    @example
    (define burst
      "Burst of light"
      (twinkle :light 80))

    ; use the new command
    (burst red)`
};

/////////////////////////////////////////////////////////////////////////////

def.meta = {
  name: 'def',
  isMacro: true,
  params: [
    { name: 'name', validate: isIdentifier },
    { name: 'command', validate: isCommand }
  ],
  desc: `
    Defines a new command or redefines an existing one,
    where variables (identifiers starting with :) become parameters.
    @example
    (def burst
      (twinkle :light 80))

    ; use the new command
    (burst red)`
};

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

function validate(node, root, descIdx) {
  let errors = [];
  validatePosition(node, root, errors);
  validateName(node, errors);
  validateDescription(node, descIdx, errors);
  return errors;
}

function validateName(node, errors) {
  let nameArg = node.args[0];
  if (isVar(nameArg)) {
    errors.push(badVariable(node, nameArg, 0));
  } else if (nameArg.value === def.meta.name || nameArg.value === define.meta.name) {
    errors.push(badRedefine(node, nameArg));
  }
}

function validateDescription(node, descIdx, errors) {
  if (descIdx === 0) return; // no description, just a name
  let descArg = node.args[descIdx];
  if (isVar(descArg)) {
    errors.push(badVariable(node, descArg, descIdx));
  }
}

function validatePosition(node, root, errors) {
  if (node !== root) {
    errors.push(badPosition(node));
  }
}

/////////////////////////////////////////////////////////////////////////////

const badVariable = (node, arg, paramIdx) => {
  let param = define.meta.params[paramIdx];
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter ${paramIdx+1} ("${param.name}"), must be ${param.validate.exp}`
  };
};

const badPosition = node => ({
  type: 'error',
  loc: node.loc,
  text: `"${node.name}" cannot be nested`
});

const badRedefine = (node, arg) => ({
  type: 'error',
  loc: node.loc,
  text: `"${arg.value}" cannot be redefined`
});

/////////////////////////////////////////////////////////////////////////////

const commands = {def, define};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////

},{"./generator":7,"./validation":11}],7:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const {isCommand} = require('./validation');

/////////////////////////////////////////////////////////////////////////////

class Generator {

  generate(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      if (!this.validateTopLevel(node)) return null;
      return this.recur(node);
    });
    if (this.errors.length > 0) return null;
    return nodes;
  }

  validateTopLevel(node) {
    if (!node.params) return true;
    // process undefined parameters
    let errors = node.params
      .map(p => badParameter(p.name, p.uses))
      .reduce((acc, val) => acc.concat(val), []); // flatten all errors
    this.errors.push(...errors);
    return node.params.length === 0;
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    let command = node.value;
    let params = command.meta.params;
    let args = node.args.map(arg => this.recur(arg));
    return ctx => command(ctx, resolve(ctx, params, args));
  }

  value(node) {
    return node.value;
  }

  variable(node) {
    return node; // unchanged
  }

}

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

const resolve = (ctx, params, args) =>
  args.map((arg, i) => {

    if (isVar(arg)) {
      // lookup a variable in the scope
      return ctx.scope[arg.name];
    }

    if (isCommand(arg)) {
      // execute a command if the param doesn't expect one,
      // which means the return value from the command is what should be
      // passed to the param
      let l = params.length;
      let param = i < l ? params[i] : params[l - 1]; // take care of a rest parameter
      if (param.validate !== isCommand) {
        return arg(ctx); // no 'await', the command must not be asynchronous!
      }
    }

    return arg;
  });

/////////////////////////////////////////////////////////////////////////////

const badParameter = (name, locs) =>
  locs.map(loc => ({
    type: 'error', loc,
    text: `"${name}" is not defined`
  }));

/////////////////////////////////////////////////////////////////////////////

module.exports = {Generator};

},{"./validation":11}],8:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const {Parser} = require('./parser');
const {Analyzer} = require('./analyzer');
const {Generator} = require('./generator');
const {Cancellable} = require('./cancellable');

/////////////////////////////////////////////////////////////////////////////

const define = require('./define');
const baseCommands = require('./base-commands');

/////////////////////////////////////////////////////////////////////////////

/**
 * Command interpreter to execute command strings.
 * @memberof commands
 */
class Interpreter {

  /**
   * @param {object.<string, commands.Command>} [commands] -
   *   Commands this interpreter recognizes.
   *   (Intrinsic commands are already available)
   */
  constructor(commands) {
    this.commands = {
      ...define.commands, // add the 'define' commands
      ...baseCommands.commands, // add the base commands
      ...commands
    };
    this.parser = new Parser();
    this.analyzer = new Analyzer(this.commands);
    this.generator = new Generator();
    this.ct = new Cancellable();
  }

  /**
   * Command names this interpreter recognizes.
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this.commands);
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name. Should be the same as the command.meta.name property.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
  }

  /**
   * Cancels any executing commands.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   */
  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable();
    }
  }

  /**
   * Executes a command asynchronously.
   * @param {string} text - Command text to execute.
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands' context, together with the cancellation token.
   *   This context cannot have key 'ct', since it would be overwritten anyway.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   * @throws Throws an error for any syntax or semantic errors in the text.
   * @returns {object[]} Array with the results of the executions of the commands.
   */
  async execute(text, ctx = {}, ct = this.ct) {
    let commands = this.process(text);

    let res = [];
    for (let i = 0; i < commands.length; ++i) {
      if (ct.isCancelled) break;
      let command = commands[i];
      res.push(await command({...ctx, ct}));
    }

    if (ct === this.ct && ct.isCancelled) {
      // this.ct was cancelled, so re-instantiate it
      this.ct = new Cancellable();
    }

    return res;
  }

  process(text) {
    // parse
    let nodes = this.parser.parse(text);
    this.raiseIfErrors(this.parser.errors);

    // analyze
    nodes = this.analyzer.analyze(nodes);
    this.raiseIfErrors(this.analyzer.errors);

    // generate
    let commands = this.generator.generate(nodes);
    this.raiseIfErrors(this.generator.errors);

    return commands || [];
  }

  raiseIfErrors(errors) {
    if (errors.length === 0) return;
    throw new Error(errors.map(this.formatError).join('\n'));
  }

  formatError(error) {
    return `${error.loc}: ${error.text}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Interpreter};

},{"./analyzer":3,"./base-commands":4,"./cancellable":5,"./define":6,"./generator":7,"./parser":9}],9:[function(require,module,exports){
const parser = require('./peg-parser');

/////////////////////////////////////////////////////////////////////////////

class Parser {

  parse(text) {
    this.errors = [];
    try {
      return parser.parse(text);
    } catch (e) {
      this.errors.push(parseError(e));
      return null;
    }
  }

}

/////////////////////////////////////////////////////////////////////////////

function parseError(e) {
  return {
    type: 'error',
    text: e.toString(),
    loc: formatLocation(e.location)
  };
}

function formatLocation(location) {
  let start = location.start;
  let end = location.end;
  return `${start.line}:${start.column}-${end.line}:${end.column}`;
}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Parser};

},{"./peg-parser":10}],10:[function(require,module,exports){
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
      peg$c6 = function(name, args) {
          return { type: 'command', name, args: args || [], loc: loc() };
        },
      peg$c7 = function(head, tail) { return [head, ...(tail || [])]; },
      peg$c8 = function(name) { return { type: 'variable', name, loc: loc() }; },
      peg$c9 = function(value) { return { type: 'value', value, loc: loc() }; },
      peg$c10 = function(command) { return command; },
      peg$c11 = ":",
      peg$c12 = peg$literalExpectation(":", false),
      peg$c13 = function(name) { return name; },
      peg$c14 = /^[a-z_]/i,
      peg$c15 = peg$classExpectation([["a", "z"], "_"], false, true),
      peg$c16 = /^[a-z_0-9\-]/i,
      peg$c17 = peg$classExpectation([["a", "z"], "_", ["0", "9"], "-"], false, true),
      peg$c18 = function(head, tail) { return head + tail.join(''); },
      peg$c19 = /^[0-9]/,
      peg$c20 = peg$classExpectation([["0", "9"]], false, false),
      peg$c21 = function(digits) { return parseInt(digits.join(''), 10); },
      peg$c22 = "\"",
      peg$c23 = peg$literalExpectation("\"", false),
      peg$c24 = function(contents) { return contents.join(''); },
      peg$c25 = "\\",
      peg$c26 = peg$literalExpectation("\\", false),
      peg$c27 = peg$anyExpectation(),
      peg$c28 = function(char) { return char; },
      peg$c29 = /^[ \t\r\n]/,
      peg$c30 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false),
      peg$c31 = ";",
      peg$c32 = peg$literalExpectation(";", false),
      peg$c33 = /^[^\r\n]/,
      peg$c34 = peg$classExpectation(["\r", "\n"], true, false),
      peg$c35 = /^[\r\n]/,
      peg$c36 = peg$classExpectation(["\r", "\n"], false, false),

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
      s2 = peg$parseArguments();
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

  function peg$parseArguments() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseArgument();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseArguments();
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

  function peg$parseArgument() {
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
      s3 = peg$parseStringContents();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseStringContents();
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
          s1 = peg$c24(s2);
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

  function peg$parseStringContents() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 34) {
      s2 = peg$c22;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c23); }
    }
    if (s2 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s2 = peg$c25;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c27); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c28(s2);
        s0 = s1;
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
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c25;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseEscapeChar();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c28(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseEscapeChar() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 34) {
      s0 = peg$c22;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c23); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s0 = peg$c25;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
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

    if (peg$c29.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c30); }
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c31;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c33.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c34); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c33.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c35.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c36); }
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
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c33.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c33.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c34); }
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
      if (peg$silentFails === 0) { peg$fail(peg$c27); }
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


    function loc() {
      let l = location();
      let start = l.start;
      let end = l.end;
      return `${start.line}:${start.column}-${end.line}:${end.column - 1}`;
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

},{}],11:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

const isIdentifier = s =>
  // A negative look behind to check for a string that does NOT end with a dash
  // is only supported on node 8.9.4 with the --harmony flag
  // https://node.green/#ES2018-features--RegExp-Lookbehind-Assertions
  // /^[a-z_][a-z_0-9-]*(?<!-)$/i
  /^[a-z_][a-z_0-9-]*$/i.test(s) && /[^-]$/.test(s);
isIdentifier.exp = 'a valid identifier';

const isNumber = n => typeof n === 'number';
isNumber.exp = 'a number';

const isString = s => typeof s === 'string';
isString.exp = 'a string';

const isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

const and = (...vfs) => {
  vfs = [...new Set(vfs)]; // remove duplicates
  if (vfs.length === 1) return vfs[0];
  let v = e => vfs.every(vf => vf(e));
  v.exp = vfs.map(vf => vf.exp).join(' and ');
  return v;
};

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  isIdentifier,
  isString,
  isNumber,
  isCommand,
  and
};

},{}],12:[function(require,module,exports){
/* eslint no-multi-spaces: 0 */

const {isLight} = require('./validation');
const {isString} = require('../commands/validation');
const {pause} = require('../commands/base-commands');
const {intersperse, flatten} = require('./utils');

//////////////////////////////////////////////////////////////////////////////

// ref: https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1677-1-200910-I!!PDF-E.pdf [PDF]

const TIME_UNIT = 110; // in ms
const
  DOT_SIGNAL = 1,
  DASH_SIGNAL = 3,
  INTER_LETTER_GAP = 1,
  LETTER_GAP = 3,
  WORD_GAP = 7,
  END_OF_INPUT_GAP = 7;

const morseCode = {
  // Letters
  'a': '.-',    'i': '..',   'r': '.-.',
  'b': '-...',  'j': '.---', 's': '...',
  'c': '-.-.',  'k': '-.-',  't': '-',
  'd': '-..',   'l': '.-..', 'u': '..-',
  'e': '.',     'm': '--',   'v': '...-',
  'é': '..-..', 'n': '-.',   'w': '.--',
  'f': '..-.',  'o': '---',  'x': '-..-',
  'g': '--.',   'p': '.--.', 'y': '-.--',
  'h': '....',  'q': '--.-', 'z': '--..',
  // Figures
  '1': '.----', '6': '-....',
  '2': '..---', '7': '--...',
  '3': '...--', '8': '---..',
  '4': '....-', '9': '----.',
  '5': '.....', '0': '-----',
  // Punctuation marks
  '.': '.-.-.-',
  ',': '--..--',
  ':': '---...',
  '?': '..--..',
  '’': '.----.', "'": '.----.',
  '–': '-....-', '-': '-....-', '−': '-....-',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '“': '.-..-.', '”': '.-..-.', '"': '.-..-.',
  '=': '-...-',
  '+': '.-.-.',
  '×': '-..-',
  '@': '.--.-.'
  // Miscellaneous signs
  /*
    Understood ...-.
    Error ........
    Invitation to transmit -.-
    Wait .-...
    End of work ...-.-
    Starting signal (to precede every transmission) -.-.-
  */
};

//////////////////////////////////////////////////////////////////////////////

function timecodeSignal(signal) {
  if (signal === '.') return DOT_SIGNAL;
  if (signal === '-') return DASH_SIGNAL;
}

function timecodeLetter(letter) {             // '.-'
  let signals = letter.split('');             // ['.', '-']
  let code = signals.map(timecodeSignal);     // [1, 3]
  return intersperse(INTER_LETTER_GAP, code); // [1, 1, 3]
}

function timecodeWord(word) {               // ['.-', '.-']
  let codes = word.map(timecodeLetter);     // [[1, 1, 3], [1, 1, 3]]
  codes = intersperse([LETTER_GAP], codes); // [[1, 1, 3], [3], [1, 1, 3]]
  return flatten(codes);                    // [1, 1, 3, 3, 1, 1, 3]
}

function timecodePhrase(phrase) {         // [['.-'], ['.-']]
  let codes = phrase.map(timecodeWord);   // [[1, 1, 3], [1, 1, 3]]
  codes = intersperse([WORD_GAP], codes); // [[1, 1, 3], [7], [1, 1, 3]]
  return flatten(codes);                  // [1, 1, 3, 7, 1, 1, 3]
}

function encodeWord(word) {
  return word                // 'aãa'
    .split('')               // ['a','ã','a']
    .map(c => morseCode[c])  // ['.-',undefined,'.-']
    .filter(c => !!c);       // ['.-','.-']
}

function timecodeText(text) {
  let phrase = text              // ' A A'
    .toLowerCase()               // ' a a'
    .split(/\s+/)                // ['', 'a', 'a']
    .filter(w => !!w)            // ['a', 'a']
    .map(encodeWord);            // [['.-'], ['.-']]
  return timecodePhrase(phrase)  // [1, 1, 3, 7, 1, 1, 3]
    .concat([END_OF_INPUT_GAP]); // [1, 1, 3, 7, 1, 1, 3, 7]
}

//////////////////////////////////////////////////////////////////////////////

async function morse({tl, ct}, [light, text]) {
  if (ct.isCancelled) return;
  let times = timecodeText(text);
  tl[light].turnOff(); // start as 'off'
  for (let i = 0; i < times.length; ++i) {
    if (ct.isCancelled) break;
    tl[light].toggle();
    await pause({ct}, [times[i] * TIME_UNIT]);
  }
}

morse.meta = {
  name: 'morse',
  params: [
    { name: 'light', validate: isLight },
    { name: 'text', validate: isString }
  ],
  desc: `
    Morse code pattern with the given light and text.
    @example
    (morse green "hello-lights")`
};

//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  cp.add('morse', morse);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  // morse-utils
  timecodeSignal,
  timecodeLetter,
  timecodeWord,
  timecodePhrase,
  encodeWord,
  timecodeText,
  // morse core
  morse,
  defineCommands
};

},{"../commands/base-commands":4,"../commands/validation":11,"./utils":18,"./validation":19}],13:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const {
  isNumber
} = require('../commands/validation');

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function use({tl, ct}, [indexes]) {
  if (ct.isCancelled) return;
  if (tl.use) {
    tl.use(indexes.map(i => i - 1)); // from 1-based to 0-based
  }
}
use.meta = {
  name: 'use',
  params: [{ name: 'indexes', validate: isNumber, isRest: true }],
  desc: `
    When using multiple traffic lights, uses the given numbered ones.
    @example
    (use 1 2)`
};

//////////////////////////////////////////////////////////////////////////////

function useNext({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.next) {
    tl.next();
  }
}
useNext.meta = {
  name: 'use-next',
  params: [],
  desc: `When using multiple traffic lights, chooses the next one or ones to use.`
};

//////////////////////////////////////////////////////////////////////////////

function usePrevious({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.previous) {
    tl.previous();
  }
}
usePrevious.meta = {
  name: 'use-previous',
  params: [],
  desc: `When using multiple traffic lights, chooses the previous one or ones to use.`
};

//////////////////////////////////////////////////////////////////////////////

function useLast({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.last) {
    tl.last();
  }
}
useLast.meta = {
  name: 'use-last',
  params: [],
  desc: `When using multiple traffic lights, chooses the last one to use.`
};

//////////////////////////////////////////////////////////////////////////////

function useNear({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.near) {
    tl.near();
  }
}
useNear.meta = {
  name: 'use-near',
  params: [],
  desc: `When using multiple traffic lights, chooses the nearest one to use.`
};

//////////////////////////////////////////////////////////////////////////////

function useAll({tl, ct}) {
  if (ct.isCancelled) return;
  if (tl.useAll) {
    tl.useAll();
  }
}
useAll.meta = {
  name: 'use-all',
  params: [],
  desc: `When using multiple traffic lights, chooses all of them to use.`
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  // add multi commands
  cp.add('use', use);
  cp.add('use-next', useNext);
  cp.add('use-previous', usePrevious);
  cp.add('use-last', useLast);
  cp.add('use-near', useNear);
  cp.add('use-all', useAll);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  use,
  'use-next': useNext,
  'use-previous': usePrevious,
  'use-last': useLast,
  'use-near': useNear,
  'use-all': useAll,
  defineCommands
};

},{"../commands/validation":11}],14:[function(require,module,exports){
const {Light, TrafficLight} = require('./traffic-light');

///////////////

/**
 * A composite light that combines all composed lights.
 * @memberof trafficLight
 * @extends trafficLight.Light
 */
class MultiLight extends Light {

  /**
   * @param {trafficLight.Light[]} lights - Lights composed.
   */
  constructor(lights) {
    super();
    this.lights = lights;
    // this.on and this.off might not reflect the underlying lights,
    // just what the multi-light has been through
  }

  /** Toggles the lights. */
  toggle() {
    super.toggle();
    this.lights.forEach(l => l.toggle());
  }

  /** Turns the lights on. */
  turnOn() {
    super.turnOn();
    this.lights.forEach(l => l.turnOn());
  }

  /** Turns the lights off. */
  turnOff() {
    super.turnOff();
    this.lights.forEach(l => l.turnOff());
  }

}

///////////////

let dummyLight = new Light();

///////////////

/**
 * A composite traffic light that combines all composed traffic lights.
 * Does not track or raise any `enabled` or `disabled` events for the composed
 * traffic lights.
 * @memberof trafficLight
 * @extends trafficLight.TrafficLight
 */
class MultiTrafficLight extends TrafficLight {

  /**
   * @param {trafficLight.TrafficLight[]} trafficLights - Traffic lights composed.
   */
  constructor(trafficLights) {
    super(dummyLight, dummyLight, dummyLight);
    this.trafficLights = trafficLights;
  }

  get trafficLights() {
    return this._trafficLights;
  }
  set trafficLights(trafficLights) {
    this._trafficLights = trafficLights;
    this.red    = new MultiLight(trafficLights.map(tl => tl.red));    // eslint-disable-line no-multi-spaces
    this.yellow = new MultiLight(trafficLights.map(tl => tl.yellow));
    this.green  = new MultiLight(trafficLights.map(tl => tl.green));  // eslint-disable-line no-multi-spaces
  }

  /**
   * If any of the composed traffic lights is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this._trafficLights.some(tl => tl.isEnabled);
  }

}

///////////////

function unique(a) {
  return [...new Set(a)];
}

///////////////

/**
 * A composite traffic light with a flexible way to select which composed
 * traffic lights are active or in use.
 * @memberof trafficLight
 * @extends trafficLight.TrafficLight
 */
class FlexMultiTrafficLight extends TrafficLight {

  /**
   * Creates a new instance of this class.
   * Starts off using the first traffic light in the provided `trafficLights`.
   * Tries to checks out the provided traffic lights.
   * @param {trafficLight.TrafficLight[]} trafficLights - Traffic lights composed.
   */
  constructor(trafficLights) {
    super(dummyLight, dummyLight, dummyLight);
    this.activeMultiTrafficLight = new MultiTrafficLight([]);
    this.allTrafficLights = trafficLights.filter(tl => tl.checkOut());
    this.allTrafficLights.forEach(tl => this._subscribe(tl));
    this.use([0]);
  }

  /**
   * Adds a traffic light to the composite.
   * Tries to exclusively check it out first and because of that won't add
   * any duplicates.
   * @param {trafficLight.TrafficLight} trafficLight - Traffic light to add.
   *   Must not be null.
   */
  add(trafficLight) {
    if (!trafficLight.checkOut()) return;
    let wasEnabled = this.isEnabled;
    this.allTrafficLights.push(trafficLight);
    this._subscribe(trafficLight);
    if (this.activeTrafficLights.length === 0) {
      this.use([0]);
    }
    if (!wasEnabled && this.isEnabled) {
      this.emit('enabled');
    }
  }

  // returns an array of the tuple: (traffic light, original index)
  get enabledTrafficLights() {
    return (
      this.allTrafficLights
        .map((tl, i) => [tl, i])
        .filter(([tl, _]) => tl.isEnabled));
  }

  // returns an array of the tuple: (traffic light, original index)
  get activeTrafficLights() {
    return (
      this.enabledTrafficLights
        .filter(([tl, _], i) => this.activeIndexes.indexOf(i) >= 0));
  }

  /**
   * Selects which traffic lights to use given their indexes (0-based),
   * only considering enabled traffic lights.
   * Indexes wrap around from the last to the first.
   * @param {number[]} activeIndexes - Traffic light indexes to use.
   *   Must not be empty.
   */
  use(activeIndexes) {
    this._setIndexes(activeIndexes);
    this.activeMultiTrafficLight.trafficLights = this.activeTrafficLights.map(([tl, _]) => tl);
    this.red = this.activeMultiTrafficLight.red;
    this.yellow = this.activeMultiTrafficLight.yellow;
    this.green = this.activeMultiTrafficLight.green;
  }

  _setIndexes(activeIndexes) {
    let tlsEnabled = this.enabledTrafficLights.map(([tl, _]) => tl);
    let l = tlsEnabled.length;
    if (l > 0) {
      activeIndexes = unique(activeIndexes.map(i => i < 0 ? l + i : i % l));
    } else {
      activeIndexes = [];
    }
    activeIndexes.sort();
    this.activeIndexes = activeIndexes;
    this.indexes = this.activeTrafficLights.map(([_, i]) => i);
  }

  _subscribe(tl) {
    tl.on('enabled', () => this._enabled(tl));
    tl.on('disabled', () => this._disabled(tl));
  }

  _enabled(tl) {
    if (this.enabledTrafficLights.length === 1) {
      // the first traffic light is enabled; all were disabled before
      this.use([0]);
      this.emit('enabled');
    } else {
      // recalculate indexes
      let tlIndex = this.allTrafficLights.indexOf(tl);
      let newActiveIndexes = this.indexes.map((i, j) => this.activeIndexes[j] + (tlIndex < i ? 1 : 0));
      this.use(newActiveIndexes);
    }
  }

  _disabled(tl) {

    if (!this.isEnabled) {
      // the only enabled traffic light was disabled
      this.use([]);
      this.emit('disabled'); // 'disabled' instead of 'interrupted'
      return;
    }

    // recalculate indexes
    let tlIndex = this.allTrafficLights.indexOf(tl);
    let activeTrafficLightWasDisabled = this.indexes.indexOf(tlIndex) >= 0;

    let newActiveIndexes = this.indexes
      .map((i, j) => tlIndex === i ? -1 : (this.activeIndexes[j] - (tlIndex < i ? 1 : 0)))
      .filter(i => i >= 0);
    if (newActiveIndexes.length === 0) {
      newActiveIndexes = [0]; // re-assign
    }
    this.use(newActiveIndexes);

    if (activeTrafficLightWasDisabled) {
      /**
       * Interrupted event. In a `FlexMultiTrafficLight`, if an active traffic
       * light gets disabled, and there are still enabled traffic lights left,
       * this event is raised. If no more traffic lights are enabled,
       * then the `disabled` event is raised.
       * @event trafficLight.FlexMultiTrafficLight#interrupted
       */
      this.emit('interrupted');
    }

  }

  /**
   * Gets the traffic light indexes that are in use.
   * If there are no traffic lights in use, or no traffic lights are useable,
   * returns an empty array.
   * @returns {number[]} The traffic light indexes that are in use.
   */
  using() {
    return this.activeIndexes;
  }

  /**
   * Selects the next traffic light to use, going back to the first one if
   * the currently selected one is the last.
   * Also works with multiple selected traffic lights, moving all to the next.
   */
  next() {
    this._move(+1);
  }

  /**
   * Selects the previous traffic light to use, going to the last one if
   * the currently selected one is the first.
   * Also works with multiple selected traffic lights, moving all to the previous.
   */
  previous() {
    this._move(-1);
  }

  /**
   * Selects the nearest traffic light to use, remembering the direction
   * of movement (forwards or backwards).
   * Also works with multiple selected traffic lights, moving all to the nearest,
   * following a single direction (so it's possible to wrap around at the last
   * if both the first and last indexes are in use).
   */
  near() {
    if (this.activeIndexes.length === 0) {
      this.use([0]);
      return;
    }

    let lastIndex = this.enabledTrafficLights.length - 1;
    if (this.activeIndexes.indexOf(0) >= 0) {
      this.direction = +1;
    } else if (this.activeIndexes.indexOf(lastIndex) >= 0) {
      this.direction = -1;
    }

    this._move(this.direction || +1);
  }

  _move(direction) {
    if (this.activeIndexes.length > 0) {
      this.use(this.activeIndexes.map(i => i + direction));
    } else {
      this.use([0]);
    }
  }

  /**
   * Selects the last traffic light to use.
   */
  last() {
    this.use([this.enabledTrafficLights.length - 1]);
  }

  /**
   * Selects all traffic lights to use simultaneously.
   */
  useAll() {
    this.use(this.enabledTrafficLights.map((_, i) => i));
  }

  /**
   * Resets all active traffic lights.
   */
  reset() {
    this.activeMultiTrafficLight.reset();
  }

  /**
   * If there are composed traffic lights and any of them is enabled.
   * @type {boolean}
   */
  get isEnabled() {
    return this.allTrafficLights.length > 0 &&
      this.allTrafficLights.some(tl => tl.isEnabled);
  }

  toString() {
    return `multi (${this.enabledTrafficLights.length};${this.activeTrafficLights.length})`;
  }

}

///////////////

module.exports = {
  MultiLight, MultiTrafficLight, FlexMultiTrafficLight
};

},{"./traffic-light":17}],15:[function(require,module,exports){
; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(cp) { cp.execute(`
;---------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  @example
  (lights off off on)"
  (do
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);cp.execute(`;-----------------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  @example
  (flash red 500)"
  (do
    (toggle :light) (pause :ms)
    (toggle :light) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define blink
  "Flashes a light for the given number of times and duration for each time:
  @example
  (blink 10 yellow 500)"
  (repeat :times
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define twinkle
  "Flashes a light for the given duration forever:
  @example
  (twinkle green 500)"
  (loop
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define cycle
  "Blinks each light in turn for the given duration and number of times,
  repeating forever; starts with red:
  @example
  (cycle 2 500)"
  (loop
    (blink :times red    :ms)
    (blink :times yellow :ms)
    (blink :times green  :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define jointly
  "Flashes all lights together forever:
  @example
  (jointly 500)"
  (loop
    (lights on  on  on)  (pause :ms)
    (lights off off off) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define heartbeat
  "Heartbeat pattern:
  @example
  (heartbeat red)"
  (loop
    (blink 2 :light 250)
    (pause 350)))

;`);cp.execute(`;-----------------------------------------------------------

(define pulse
  "Single pulse pattern:
  @example
  (pulse red)"
  (loop
    (toggle :light)
    (pause 300)
    (toggle :light)
    (pause 1500)))

;`);cp.execute(`;-----------------------------------------------------------

(define count
  "Count a number of times repeatedly:
  @example
  (count 7 red)"
  (loop
    (blink :times :light 200)
    (pause 800)))

;`);cp.execute(`;-----------------------------------------------------------

(define sos
  "SOS distress signal morse code pattern:
  @example
  (sos red)"
  (loop
    (morse :light "SOS")))

;`);cp.execute(`;-----------------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);cp.execute(`;-----------------------------------------------------------

(define up
  "Go up with the given duration:
  @example
  (up 200)"
  (do
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);cp.execute(`;-----------------------------------------------------------

(define down
  "Go down with the given duration:
  @example
  (down 200)"
  (do
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle green)  (pause :ms) (toggle green)))

;`);cp.execute(`;-----------------------------------------------------------

(define bounce
  "Bounce with the given duration:
  @example
  (bounce 500)"
  (loop
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)))

;`);cp.execute(`;-----------------------------------------------------------

(define activity
  "Time an activity from green (go) to yellow (attention) to red (stop).
  Blinks green before starting for 5 seconds, keeps green on for the 'green-ms'
  duration, turns yellow on for the 'yellow-ms' duration, then blinks yellow
  for 'attention-ms' duration before turning on red (stop).
  E.g. for an activity that takes one minute with green for 40s, yellow for 10s,
  then yellow blinking for 10s:
  @example
  (activity 40000 10000 10000)"
  (do
    (blink 4 green 500)
    (turn green on)
    (pause :green-ms)
    (lights off on off)
    (pause :yellow-ms)
    (turn yellow off)
    (timeout :attention-ms (twinkle yellow 500))
    (lights on off off)))

;`); }//--------------------------------------------------------------------

},{}],16:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Traffic Light.
//////////////////////////////////////////////////////////////////////////////

const {turnLight} = require('./utils');
const {isLight, isState} = require('./validation');

//////////////////////////////////////////////////////////////////////////////

function toggle({tl, ct}, [light]) {
  if (ct.isCancelled) return;
  tl[light].toggle();
}
toggle.meta = {
  name: 'toggle',
  params: [{ name: 'light', validate: isLight }],
  desc: `
    Toggles the given light.
    @example
    (toggle green)`
};

//////////////////////////////////////////////////////////////////////////////

function turn({tl, ct}, [light, on]) {
  if (ct.isCancelled) return;
  turnLight(tl[light], on);
}
turn.meta = {
  name: 'turn',
  params: [
    { name: 'light', validate: isLight },
    { name: 'state', validate: isState }
  ],
  desc: `
    Turns the given light on or off.
    @example
    (turn green on)`
};

//////////////////////////////////////////////////////////////////////////////

async function reset({tl, ct}) {
  if (ct.isCancelled) return;
  await tl.reset();
}
reset.meta = {
  name: 'reset',
  params: [],
  desc: `Sets all lights to off.`
};

//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  // add base commands
  cp.add('toggle', toggle);
  cp.add('turn', turn);
  cp.add('reset', reset);
  // add other commands
  require('./morse').defineCommands(cp);
  // add higher-level commands
  require('./traffic-light-commands.cljs')(cp);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  toggle, turn, reset,
  defineCommands
};

},{"./morse":12,"./traffic-light-commands.cljs":15,"./utils":18,"./validation":19}],17:[function(require,module,exports){
///////////////////////////////////////////////////////////////////

/**
 * A Light in a traffic light.
 * @memberof trafficLight
 */
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

const EventEmitter = require('events');

///////////////////////////////////////////////////////////////////

/**
 * A Traffic Light with red, yellow and green lights.
 * @memberof trafficLight
 * @extends EventEmitter
 */
class TrafficLight extends EventEmitter {

  /**
   * @param {trafficLight.Light} [red] - Red light.
   * @param {trafficLight.Light} [yellow] - Yellow light.
   * @param {trafficLight.Light} [green] - Green light.
   */
  constructor(red, yellow, green) {
    super();
    /** The red light.
      * @type {trafficLight.Light}
      */
    this.red = red || new Light;
    /** The yellow light.
     * @type {trafficLight.Light}
     */
    this.yellow = yellow || new Light;
    /** The green light.
     * @type {trafficLight.Light}
     */
    this.green = green || new Light;
    /**
     * If the traffic light is checked-out or reserved.
     * @type {boolean}
     */
    this.isCheckedOut = false;
  }

  /** Sets all lights to off. */
  reset() {
    this.red.turnOff();
    this.yellow.turnOff();
    this.green.turnOff();
  }

  /**
   * If the traffic light is enabled and ready to use.
   * @type {boolean}
   */
  get isEnabled() {
    return true;
  }

  /**
   * Checks-out or reserve the traffic light for exclusive usage, making it
   * unavailable for other users.
   * @returns {boolean} True if the traffic light was successfully checked out.
   *   False if it was already checked out.
   */
  checkOut() {
    if (this.isCheckedOut) return false;
    return this.isCheckedOut = true;
  }

  /**
   * Checks-in the traffic light, making it available for checking out again.
   */
  checkIn() {
    this.isCheckedOut = false;
  }

  /**
   * If the traffic light is available: enabled and not checked-out.
   * @type {boolean}
   */
  get isAvailable() {
    return this.isEnabled && !this.isCheckedOut;
  }

}

///////////////////////////////////////////////////////////////////

/**
 * Traffic light enabled event.
 * @event trafficLight.TrafficLight#enabled
 */

/**
 * Traffic light disabled event.
 * @event trafficLight.TrafficLight#disabled
 */

///////////////////////////////////////////////////////////////////

module.exports = {
  Light, TrafficLight
};

},{"events":1}],18:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////////////////////////////

function intersperse(sep, arr) {
  let res = [];
  let len = arr.length;
  if (len === 0) return res;
  let idx = 0;
  for (; idx < len - 1; ++idx) res.push(arr[idx], sep);
  res.push(arr[idx]);
  return res;
}

const flatten = arr =>
  arr.reduce((acc, val) => acc.concat(val), []);

//////////////////////////////////////////////////////////////////////////////

const isOn = state =>
  (state === 'off' || state === 'false') ? false : !!state;

const turnLight = (oLight, state) =>
  oLight[isOn(state) ? 'turnOn' : 'turnOff']();

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  intersperse,
  flatten,
  isOn,
  turnLight
};

//////////////////////////////////////////////////////////////////////////////

},{}],19:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Validation functions
//////////////////////////////////////////////////////////////////////////////

const isLight = l => l === 'red' || l === 'yellow' || l === 'green';
isLight.exp = '"red", "yellow" or "green"';

const isState = s => s === 'on' || s === 'off';
isState.exp = '"on" or "off"';

//////////////////////////////////////////////////////////////////////////////

module.exports = {isLight, isState};

//////////////////////////////////////////////////////////////////////////////

},{}],20:[function(require,module,exports){
////////////////////////////////////////////////////////

class WebCommandFormatter {

  constructor(command) {
    this.command = command;
  }

  formatParams() {
    return this.command.meta.params
      .map(param => ':' + param.name).join(' ');
  }

  formatSignature() {
    return `<h3><code>${this.command.meta.name} ${this.formatParams()}</code></h3>`;
  }

  formatVariable(variable) {
    return `<code class="variable">${variable}</code>`;
  }

  formatSample(sample) {
    sample = sample.replace(/^\s*?\n/s, ''); // remove first empty lines
    let indentSize = sample.search(/[^ \t]|$/); // get indend size of first line
    sample = sample
      .replace(new RegExp(`^[ \\t]{${indentSize}}`, 'gm'), '') // unindent
      .replace(/^([ \t]+)/gm, (_, spaces) => spaces.replace(/\s/g, '&nbsp;')); // indentation
    return `<br /><div class="sample">${sample}</div>`;
  }

  formatDesc() {
    return this.command.meta.desc
      .replace(/^\s*?\n/s, '') // remove first empty lines
      .replace(/'([^']+)'/g, (_, variable) => this.formatVariable(variable))
      .replace(/@example(.+)$/s, (_, sample) => this.formatSample(sample))
      .replace(/\n/g, '<br />\n');
  }

  format() {
    return `${this.formatSignature()}${this.formatDesc()}`;
  }

}

////////////////////////////////////////////////////////

function setUpHelp(commander, runCommand) {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commandNames = commander.commandNames;
  for (let i = 0; i < commandNames.length; ++i) {
    let commandName = commandNames[i];
    let command = commander.commands[commandName];
    divHelp.innerHTML += new WebCommandFormatter(command).format();
  }
  setUpSamples(runCommand);
}

////////////////////////////////////////////////////////

function setUpSamples(runCommand) {
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

////////////////////////////////////////////////////////

module.exports = {
  setUpHelp
};

},{}],21:[function(require,module,exports){
const {Commander} = require('../src/commander');
const {setUpHelp} = require('./help');
const {MultiTrafficLightSelector} = require('./web-traffic-light');

////////////////////////////////////////////////////////////////////////////

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

const logger = {
  log: info,
  error
};

////////////////////////////////////////////////////////////////////////////

function execute(commandStr) {
  clearError();
  window.commander.run(commandStr);
  if (commandStr.match(/define/)) {
    setTimeout(showHelp, 0); // yield
  }
}

////////////////////////////////////////////////////////////////////////////

function showHelp() {
  setUpHelp(window.commander, runCommand);
};

////////////////////////////////////////////////////////////////////////////

function setUpActions() {
  let txtCommand = document.querySelector('#command');
  txtCommand.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.keyCode === 13 || e.keyCode === 10)) { // CTRL+ENTER
      execute(txtCommand.value);
    }
  });

  let btnRun = document.querySelector('#run');
  btnRun.addEventListener('click', () => execute(txtCommand.value));

  let btnCancel = document.querySelector('#cancel');
  btnCancel.addEventListener('click', () => window.commander.cancel());

  let btnReset = document.querySelector('#reset');
  btnReset.addEventListener('click', () => execute('reset'));
}

////////////////////////////////////////////////////////////////////////////

function runCommand(command) {
  let txtCommand = document.querySelector('#command');
  txtCommand.value = command;
  execute(command);
}

////////////////////////////////////////////////////////////////////////////

function setUpTrafficLight(n) {
  let selector = new MultiTrafficLightSelector('#tl', '#switch', n);
  window.commander = new Commander({logger, selector});
  selector.setUpMultiCommands(window.commander);
}

////////////////////////////////////////////////////////////////////////////

function main() {
  setUpTrafficLight(document.querySelectorAll('.traffic-light').length);
  showHelp();
  setUpActions();
  let txtCommand = document.querySelector('#command');
  execute(txtCommand.value);
}

////////////////////////////////////////////////////////////////////////////

if (document.readyState !== 'loading') {
  main();
} else {
  document.addEventListener('DOMContentLoaded', main);
}

},{"../src/commander":2,"./help":20,"./web-traffic-light":22}],22:[function(require,module,exports){
const {Light, TrafficLight} = require('../src/traffic-light/traffic-light');
const {FlexMultiTrafficLight} = require('../src/traffic-light/multi-traffic-light');

////////////////////////////////////////////////////////////////////////////

class WebLight extends Light {
  constructor(selector) {
    super();
    this.elLight = document.querySelector(selector);
    this.elLight.addEventListener('click', () => this.toggle());
    this.enabled = true;
  }
  toggle() {
    if (!this.enabled) return;
    super.toggle();
    this.elLight.classList.toggle('on');
  }
  turnOn() {
    if (!this.enabled) return;
    super.turnOn();
    this.elLight.classList.add('on');
  }
  turnOff() {
    if (!this.enabled) return;
    super.turnOff();
    this.elLight.classList.remove('on');
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
}

////////////////////////////////////////////////////////////////////////////

class WebTrafficLight extends TrafficLight {
  constructor(selector, switchSelector) {
    super(
      new WebLight(selector + ' > .red'),
      new WebLight(selector + ' > .yellow'),
      new WebLight(selector + ' > .green'));
    this.selector = selector;
    this.elTrafficLight = document.querySelector(selector);
    this.elSwitch = document.querySelector(switchSelector);
    if (this.elSwitch) {
      this.elSwitch.addEventListener('click', () => this._setEnabled(this.elSwitch.checked));
    }
    this._setEnabled(true);
  }
  get isEnabled() {
    return this.enabled;
  }
  enable() {
    this._setEnabled(true);
  }
  disable() {
    this._setEnabled(false);
  }
  _setEnabled(enabled) {
    if (this.enabled === enabled) return;
    if (!enabled) this.reset();
    [this, this.red, this.yellow, this.green].forEach(e => e.enabled = enabled);
    this.elTrafficLight.classList[enabled ? 'remove' : 'add']('disabled');
    this.emit(enabled ? 'enabled' : 'disabled');
  }
  toString() {
    return this.selector;
  }
}

////////////////////////////////////////////////////////////////////////////

const EventEmitter = require('events');

////////////////////////////////////////////////////////////////////////////

class MultiTrafficLightSelector extends EventEmitter {
  constructor(tlIdPrefix, switchIdPrefix, n) {
    super();
    let tls = [];
    for (let i = 1; i <= n; ++i) {
      tls.push(this._createTrafficLight(tlIdPrefix + i, switchIdPrefix + i));
    }
    this._tl = new FlexMultiTrafficLight(tls);
    this._tl.on('enabled', () => this.emit('enabled'));
    this._tl.on('disabled', () => this.emit('disabled'));
    this._tl.on('interrupted', () => this.emit('interrupted'));
    this.n = n;
  }
  _createTrafficLight(selector, switchSelector) {
    let tl = new WebTrafficLight(selector, switchSelector);
    return tl;
  }
  resolveTrafficLight() {
    return this._tl.isEnabled ? this._tl : null;
  }
  setUpMultiCommands(commander) {
    if (this.n > 1) {
      const {defineCommands} = require('../src/traffic-light/multi-traffic-light-commands');
      defineCommands(commander.interpreter);
    }
  }
}

////////////////////////////////////////////////////////////////////////////

module.exports = {
  MultiTrafficLightSelector
};

},{"../src/traffic-light/multi-traffic-light":14,"../src/traffic-light/multi-traffic-light-commands":13,"../src/traffic-light/traffic-light":17,"events":1}]},{},[21]);
