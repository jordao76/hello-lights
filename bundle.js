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

const {CommandParser} = require('./parsing/command-parser');
const {defineCommands} = require('./traffic-light/traffic-light-commands'); // TODO: put this in a base TrafficLightSelector class
// the default command parser
const Parser = new CommandParser();
defineCommands(Parser);

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
   * @param {parsing.CommandParser} [options.parser] - The Command Parser to use.
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
      parser = Parser,
      selector = null,
      selectorCtor = SelectorCtor
    } = options;
    this.logger = logger;
    this.parser = parser;

    this.selector = selector || new selectorCtor({...options, logger, parser}); // eslint-disable-line new-cap
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
    this.parser.cancel();
  }

  _interrupt() {
    if (!this.running) return;
    this.isInterrupted = true;
    this.parser.cancel();
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
    this.parser.cancel();
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
    let res = await this.parser.execute(command, {tl});
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
    return this.parser.commandNames;
  }

  /**
   * All supported commands indexed by their names.
   * @type {object.<string, parsing.CommandFunction>}
   */
  get commands() {
    return this.parser.commands;
  }

  /**
   * Logs the help info for the given command name.
   * @param {string} commandName - Name of the command to log help info.
   */
  help(commandName) {
    let command = this.parser.commands[commandName];
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    let paramNames = command.paramNames, params = '';
    const validationText = i => {
      if (!command.validation) return '';
      return ` (${command.validation[i].exp})`;
    };
    if (paramNames && paramNames.length > 0) {
      params = ' ' + paramNames.map((n, i) => ':' + n + validationText(i)).join(' ');
    }
    this.logger.log(`${command.doc.name}${params}`);
    this.logger.log(command.doc.desc);
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
 * @param {parsing.CommandParser} [options.parser] - The Command Parser to use.
 * @returns {Commander} A multi-traffic-light commander.
 */
Commander.multi = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-multi-traffic-light-selector');
  let {selectorCtor = SelectorCtor} = options;
  return new Commander({...options, selectorCtor});
};

////////////////////////////////////////////////

module.exports = {Commander};

},{"./parsing/command-parser":5,"./traffic-light/traffic-light-commands":12}],3:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
// Defines base commands to control a Device.
// The commands are cancellable by a Cancellation Token.
// Cancellation Tokens are instances of Cancellable.
//////////////////////////////////////////////////////////////////////////////

const {
  isIdentifier,
  isNumber,
  isGreaterThanZero,
  isPeriod,
  isCommand,
  each
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
cancel.paramNames = []; // no parameters
cancel.validation = []; // validates number of parameters (zero)
cancel.doc = {
  name: 'cancel',
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
pause.paramNames = ['ms'];
pause.validation = [isPeriod];
pause.doc = {
  name: 'pause',
  desc: 'Pauses execution for the given duration in milliseconds:\n' +
        '(pause 500)'
};

//////////////////////////////////////////////////////////////////////////////

// Executes a command with a timeout
async function timeout(ctx, [ms, command]) {
  let {ct = cancellable, scope = {}} = ctx;
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
timeout.paramNames = ['ms', 'command'];
timeout.validation = [isPeriod, isCommand];
timeout.doc = {
  name: 'timeout',
  desc: 'Executes a command with a timeout:\n' +
        '(timeout 5000 (twinkle red 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function run(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  for (let i = 0; i < commands.length; ++i) {
    if (ct.isCancelled) return;
    let command = commands[i];
    await command({...ctx, ct, scope});
  }
}
run.transformation = args => [args];
run.paramNames = ['commands'];
run.validation = [each(isCommand)];
run.doc = {
  name: 'do',
  desc: 'Executes the given commands in sequence:\n' +
        '(do\n  (toggle red)\n  (pause 1000)\n  (toggle red))'
};

//////////////////////////////////////////////////////////////////////////////

async function loop(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (!commands || commands.length === 0) return;
  while (true) {
    if (ct.isCancelled) return;
    await run({...ctx, ct, scope}, [commands]);
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

async function repeat(ctx, [times, commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  while (times-- > 0) {
    if (ct.isCancelled) return;
    await run({...ctx, ct, scope}, [commands]);
  }
}
repeat.transformation = args => [args[0], args.slice(1)];
repeat.paramNames = ['times', 'commands'];
repeat.validation = [isGreaterThanZero, each(isCommand)];
repeat.doc = {
  name: 'repeat',
  desc: 'Executes the commands in sequence, repeating the given number of times:\n' +
        '(repeat 5\n  (toggle green)\n  (pause 400)\n  (toggle red)\n  (pause 400))'
};

//////////////////////////////////////////////////////////////////////////////

async function all(ctx, [commands]) {
  let {ct = cancellable, scope = {}} = ctx;
  if (ct.isCancelled) return;
  await Promise.all(commands.map(command => {
    // since the commands run in parallel, they must
    // have separate scopes so as not to step in each other's toes
    return command({...ctx, ct, scope: {...scope}});
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

async function ease(ctx, [easing, ms, what, from, to, command]) {
  let {ct = cancellable, scope = {}} = ctx;
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
    await timeout({...ctx, ct, scope}, [max, command]);
  }
}
ease.paramNames = ['easing', 'ms', 'what', 'from', 'to', 'command'];
ease.validation = [isEasing, isPeriod, isIdentifier, isNumber, isNumber, isCommand];
ease.doc = {
  name: 'ease',
  desc: "Ease the 'what' variable to 'command'.\n" +
        "In the duration 'ms', go from 'from' to 'to' using the 'easing' function:\n" +
        '(ease linear 10000 ms 50 200\n  (flash yellow :ms))'
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

module.exports = {
  cancel,
  pause, timeout,
  'do': run,
  loop, repeat, all, ease
};

},{"./cancellable":4,"./validation":7}],4:[function(require,module,exports){
/**
 * A Cancellation Token (ct) that commands can check for cancellation.
 * Commands should regularly check for the {@link Cancellable#isCancelled}
 * attribute and exit eagerly if true.
 * Keeps a list of timeout IDs issued by {@link setTimeout} calls and cancels
 * them all when {@link Cancellable#cancel} is called, setting the
 * {@link Cancellable#isCancelled} attribute to true.
 * @memberof parsing
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

},{}],5:[function(require,module,exports){
const baseCommands = require('./base-commands');
const {Cancellable} = require('./cancellable');
const parser = require('./command-peg-parser');
const {isIdentifier, isString, isCommand, and} = require('./validation');

//////////////////////////////////////////////////////////////////////////////

/**
 * Parses and executes commands.
 * @memberof parsing
 */
class CommandParser {

  /**
   * @param {object.<string, parsing.CommandFunction>} [commands] -
   *   Base commands this parser recognizes.
   */
  constructor(commands = baseCommands) {
    if (commands === baseCommands) {
      // clone base-commands so it's not changed if new commands are added
      this.commands = {...commands};
    } else {
      this.commands = commands;
    }
    this._addDefine();
    this.ct = new Cancellable;
  }

  /**
   * Command names this parser recognizes.
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this.commands);
  }

  /**
   * Cancels any executing commands.
   * @param {parsing.Cancellable} [ct] - Cancellation token.
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
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands context, together with the cancellation token and the scope.
   *   This context cannot have keys 'ct' and 'scope', since they would be
   *   overwritten anyway.
   * @param {parsing.Cancellable} [ct] - Cancellation token.
   * @param {object} [scope] - Scope for variables in the command.
   */
  async execute(commandStr, ctx = {}, ct = this.ct, scope = {}) {
    if (ct.isCancelled) return;
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let res;
    for (let i = 0; i < asts.length; ++i) {
      let command = generator.execute(asts[i]);
      res = await command({...ctx, ct, scope});
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
   * @returns {(parsing.CommandFunction|parsing.CommandFunction[])}
   *   One or many command functions.
   */
  parse(commandStr) {
    let asts = parser.parse(commandStr);
    let generator = new Generator(this);
    let commands = asts.map(ast => generator.execute(ast));
    if (commands.length === 1) return commands[0];
    return commands;
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {parsing.CommandFunction} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
  }

  // Defines a new command or redefines an existing one.
  // Used by the 'define' command.
  _define(name, command, desc = '') {
    let paramNames = command.paramNames || [];
    let newCommand = (ctx, params = []) => {
      let {scope = {}} = ctx;
      Validator.validate(newCommand, params);
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({...ctx, scope});
    };
    newCommand.doc = {name, desc};
    newCommand.paramNames = paramNames;
    newCommand.validation = command.validation;
    newCommand.toString = () => `${name}`;
    return this.commands[name] = newCommand;
  }

  _addDefine() {
    // add the 'define' command, which is intrinsic to the CommandParser
    let define = (ctx, [name, desc, command]) => this._define(name, command, desc);
    define.doc = {
      name: 'define',
      desc: 'Defines a new command or redefines an existing one, where variables become parameters:\n' +
            '(define burst\n  "Burst of light: (burst red)"\n  (twinkle :light 70))\n\n(burst red)'
    };
    define.paramNames = ['name', 'desc', 'command'];
    define.validation = [isIdentifier, isString, isCommand];
    this.add('define', define);
  }

}

//////////////////////////////////////////////////////////////////////////////
// argument utils
//////////////////////////////////////////////////////////////////////////////
// an argument is either a variable, a value or a command:
//   1. variable :: { type: 'variable', name: <variable name>, validation: [...] }
//   2. value    :: any
//   3. command  :: CommandFunction
//////////////////////////////////////////////////////////////////////////////

const isVar = a => a && a.type === 'variable';

const isValid = (vf, a) => {
  if (!a) return false;
  if (isVar(a)) return true;
  return vf(a);
};

const getValue = (a, scope = null) => {
  if (Array.isArray(a)) return a.map(a => getValue(a, scope));
  if (isVar(a)) {
    if (scope) return scope[a.name];
    return ':' + a.name;
  }
  return a;
};

//////////////////////////////////////////////////////////////////////////////

class Vars {
  constructor(args) {
    this.args = args;
  }
  resolve(scope) {
    return this.args.map(a => getValue(a, scope));
  }
}

//////////////////////////////////////////////////////////////////////////////

class Generator {

  constructor(parser) {
    this.parser = parser;
    this.commands = parser.commands;
  }

  execute(ast) {
    this.variables = new Map();
    this.errors = [];
    let res = this.recur(ast);
    Validator.raiseIf(this.errors);
    return res;
  }

  recur(node) {
    // possible types: command, variable, value
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

    // collect validation functions
    if (command.validation) {
      args
        .map((a, i) => isVar(a) ? { name: a.name, vf: command.validation[i] } : null)
        .filter(v => !!v) // remove nulls
        .forEach(v => {
          let vf = this.variables.get(v.name).validation;
          this.variables.get(v.name).validation = vf ? and(vf, v.vf) : v.vf;
        });
    }

    // return a command that takes a context including an
    // optional scope with variable bindings
    let vars = new Vars(args);
    let res = (ctx) => {
      let {scope = {}} = ctx;
      let params = vars.resolve(scope);
      Validator.validate(command, params);
      return command(ctx, params);
    };
    // note: these are ALL the variables collected so far,
    // not only the ones relevant for this command
    // e.g. (run (toggle :l1) (pause :ms) (toggle :l2))
    //   'pause' will have [l1, ms]
    //   the second 'toggle' will have [l1, ms, l2]
    res.paramNames = Array.from(this.variables.keys());
    if (command.validation) {
      res.validation = Array.from(this.variables.values()).map(v => v.validation);
    }
    res.toString = () => `${commandName}`;
    return res;
  }

  variable(node) {
    let name = node.name, vs = this.variables;
    if (!vs.has(name)) {
      vs.set(name, node);
    }
    return vs.get(name);
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

const Validator = {

  validate(command, args) {
    let errors = this.collect(command, args);
    this.raiseIf(errors);
  },

  raiseIf(errors) {
    if (errors.length > 0) throw new Error(errors.join('\n'));
  },

  collect(command, args) {
    const badArity = (exp, act) =>
      `Bad number of arguments to "${commandName}"; it takes ${exp} but was given ${act}`;
    const badValue = (i) => {
      if (args[i] === undefined) return null;
      return `Bad value "${getValue(args[i])}" to "${commandName}" parameter ${i+1} ("${pns[i]}"); must be: ${vfs[i].exp}`;
    };

    let commandName = command.doc ? command.doc.name : command.name;
    let pns = command.paramNames; // pns = Parameter NameS
    let es = []; // es = ErrorS

    if (pns.length !== args.length) {
      es.push(badArity(pns.length, args.length));
    }

    let vfs = command.validation || []; // vfs = Validation FunctionS
    let argsErrors = vfs
      .map((vf, i) => args.length <= i || isValid(vf, args[i]) ? null : badValue(i))
      .filter(e => e); // filter out 'null', where the validation was successful
    es.push(...argsErrors);
    return es;
  }

};

//////////////////////////////////////////////////////////////////////////////

module.exports = {CommandParser};

},{"./base-commands":3,"./cancellable":4,"./command-peg-parser":6,"./validation":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
};
const isGreaterThanZero = isGreaterThan(0);

const isGreaterThanOrEqual = n => {
  let v = x => isNumber(x) && x >= n;
  v.exp = `a number (>= ${n})`;
  return v;
};
const isGreaterThanOrEqualZero = isGreaterThanOrEqual(0);

const isPeriod = isGreaterThanOrEqualZero;

const isCommand = f => typeof f === 'function';
isCommand.exp = 'a command';

const each = vf => {
  let v = a => Array.isArray(a) && a.length > 0 && a.every(e => vf(e));
  v.exp = `each is ${vf.exp} (and at least 1)`;
  return v;
};

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
  isGreaterThan,
  isGreaterThanZero,
  isGreaterThanOrEqual,
  isGreaterThanOrEqualZero,
  isPeriod,
  isCommand,
  each,
  and
};

},{}],8:[function(require,module,exports){
/* eslint no-multi-spaces: 0 */

const {isLight} = require('./validation');
const {isString} = require('../parsing/validation');
const {pause} = require('../parsing/base-commands');
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
/** @deprecated */
morse.paramNames = ['light', 'text'];
morse.validation = [isLight, isString];
morse.doc = {
  name: 'morse',
  desc: 'Morse code pattern with the given light and text:\n' +
        '(morse green "hello-lights")'
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

},{"../parsing/base-commands":3,"../parsing/validation":7,"./utils":14,"./validation":15}],9:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const {
  isGreaterThanZero,
  each
} = require('../parsing/validation');

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
  params: [{ name: 'indexes', validate: isGreaterThanZero, isRest: true }],
  desc: `
    When using multiple traffic lights, uses the given numbered ones.
    @example
    (use 1 2)`
};
/** @deprecated */
use.transformation = args => [args];
use.paramNames = ['indexes'];
use.validation = [each(isGreaterThanZero)];
use.doc = {
  name: 'use',
  desc: 'When using multiple traffic lights, uses the given numbered ones:\n' +
        '(use 1 2)'
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
/** @deprecated */
useNext.paramNames = [];
useNext.validation = [];
useNext.doc = {
  name: 'use-next',
  desc: 'When using multiple traffic lights, chooses the next one or ones to use.'
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
/** @deprecated */
usePrevious.paramNames = [];
usePrevious.validation = [];
usePrevious.doc = {
  name: 'use-previous',
  desc: 'When using multiple traffic lights, chooses the previous one or ones to use.'
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
/** @deprecated */
useLast.paramNames = [];
useLast.validation = [];
useLast.doc = {
  name: 'use-last',
  desc: 'When using multiple traffic lights, chooses the last one to use.'
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
/** @deprecated */
useNear.paramNames = [];
useNear.validation = [];
useNear.doc = {
  name: 'use-near',
  desc: 'When using multiple traffic lights, chooses the nearest one to use.'
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
/** @deprecated */
useAll.paramNames = [];
useAll.validation = [];
useAll.doc = {
  name: 'use-all',
  desc: 'When using multiple traffic lights, chooses all of them to use.'
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

},{"../parsing/validation":7}],10:[function(require,module,exports){
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

},{"./traffic-light":13}],11:[function(require,module,exports){
; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(cp) { cp.execute(`
;---------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  (lights off off on)"
  (do
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);cp.execute(`;-----------------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  (flash red 500)"
  (do
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
    (morse :light "SOS")))

;`);cp.execute(`;-----------------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);cp.execute(`;-----------------------------------------------------------

(define up
  "Go up with the given duration:
  (up 200)"
  (do
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);cp.execute(`;-----------------------------------------------------------

(define down
  "Go down with the given duration:
  (down 200)"
  (do
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

;`);cp.execute(`;-----------------------------------------------------------

(define activity
  "Time an activity from green (go) to yellow (attention) to red (stop).
  Blinks green before starting for 5 seconds, keeps green on for the 'green-ms'
  duration, turns yellow on for the 'yellow-ms' duration, then blinks yellow
  for 'attention-ms' duration before turning on red (stop).
  E.g. for an activity that takes one minute with green for 40s, yellow for 10s,
  then yellow blinking for 10s:
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

},{}],12:[function(require,module,exports){
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
/** @deprecated */
toggle.paramNames = ['light'];
toggle.validation = [isLight];
toggle.doc = {
  name: 'toggle',
  desc: 'Toggles the given light:\n(toggle green)'
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
/** @deprecated */
turn.paramNames = ['light', 'state'];
turn.validation = [isLight, isState];
turn.doc = {
  name: 'turn',
  desc: 'Turns the given light on or off:\n' +
        '(turn green on)'
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
/** @deprecated */
reset.paramNames = []; // no parameters
reset.validation = []; // validates number of parameters (zero)
reset.doc = {
  name: 'reset',
  desc: 'Sets all lights to off.'
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

},{"./morse":8,"./traffic-light-commands.cljs":11,"./utils":14,"./validation":15}],13:[function(require,module,exports){
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

},{"events":1}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
////////////////////////////////////////////////////////

class WebCommandFormatter {

  constructor(command) {
    this.command = command;
  }

  formatParams() {
    return this.command.paramNames
      .map(param => ':' + param).join(' ');
  }

  formatSignature() {
    return `<h3><code>${this.command.doc.name} ${this.formatParams()}</code></h3>`;
  }

  formatVariable(variable) {
    return `<code class="variable">${variable}</code>`;
  }

  formatSample(sample) {
    sample = sample.trim().replace(/\n {2}/g, '\n&nbsp;&nbsp;'); // indentation
    return `:<br /><br /><div class="sample">${sample}</div>`;
  }

  formatDesc() {
    return this.command.doc.desc
      .replace(/'([^']+)'/g, (_, variable) => this.formatVariable(variable))
      .replace(/:(\s*\(.+\)\s*)$/s, (_, sample) => this.formatSample(sample))
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

},{}],17:[function(require,module,exports){
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

},{"../src/commander":2,"./help":16,"./web-traffic-light":18}],18:[function(require,module,exports){
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
      defineCommands(commander.parser);
    }
  }
}

////////////////////////////////////////////////////////////////////////////

module.exports = {
  MultiTrafficLightSelector
};

},{"../src/traffic-light/multi-traffic-light":10,"../src/traffic-light/multi-traffic-light-commands":9,"../src/traffic-light/traffic-light":13,"events":1}]},{},[17]);
