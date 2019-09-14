(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":6,"_process":5,"inherits":3}],8:[function(require,module,exports){
////////////////////////////////////////////////

const fs = require('fs');
const util = require('util');

////////////////////////////////////////////////

function tryRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return {};
  }
}

////////////////////////////////////////////////

// The default Selector constructor.
// This is an optional requirement since when used in a web context
// it would fail because of further USB-related dependencies.
// Browserify won't pick it up since the `require` call is encapsulated in `tryRequire`.
// If DefaultSelectorCtor is null, then it's a mandatory option to the Commander ctor.
const DefaultSelectorCtor = tryRequire('./selectors/physical-traffic-light-selector').SelectorCtor;

////////////////////////////////////////////////

function makeDefaultInterpreter() {
  const {Interpreter} = require('./commands/interpreter');
  const interpreter = new Interpreter();
  // define all commands
  require('./traffic-light/traffic-light-commands').defineCommands(interpreter);
  require('./traffic-light/multi-traffic-light-commands').defineCommands(interpreter);
  return interpreter;
}

////////////////////////////////////////////////

function makeDefaultFormatter() {
  const {MetaFormatter} = require('./commands/meta-formatter');
  return new MetaFormatter();
}

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
   * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
   *   a command.
   * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
   * @param {object} [options.selector] - The traffic light selector to use.
   *   Takes precedence over `options.SelectorCtor`.
   * @param {function} [options.SelectorCtor] - The constructor of a traffic
   *   light selector to use. Will be passed the entire `options` object.
   *   Ignored if `options.selector` is set.
   */
  constructor(options = {}) {
    let {
      logger = console,
      formatter = makeDefaultFormatter(),
      interpreter = makeDefaultInterpreter(),
      selector = null,
      SelectorCtor = DefaultSelectorCtor
    } = options;
    this.logger = logger;
    this.formatter = formatter;
    this.interpreter = interpreter;
    this.selector = selector || new SelectorCtor(options);
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
   * Executes a file with command definitions asynchronously.
   * @param {string} filePath - Path to the file to execute.
   *   Should only contain command definitions (`define` or `def`).
   * @param {string} [encoding='utf8'] - Encoding of the file.
   */
  async runDefinitionsFile(filePath, encoding = 'utf8') {
    let command = await this._readFile(filePath, encoding);
    if (command) return this.runDefinitions(command);
  }

  /**
   * Executes a command with definitions asynchronously.
   * @param {string} command - Command to execute. Should only contain command
   *   definitions (`define` or `def`).
   */
  async runDefinitions(command) {
    try {
      this.logger.log('running definitions');
      await this.interpreter.execute(command); // no context, only for definitions
      this.logger.log('finished definitions');
    } catch (e) {
      this.logger.error('error in definitions');
      this.logger.error(e.message);
    }
  }

  /**
   * Executes a command file asynchronously.
   * If the same command is already running, does nothing.
   * If another command is running, cancels it, resets the traffic light,
   * and runs the new command.
   * If no command is running, executes the given command, optionally
   * resetting the traffic light based on the `reset` parameter.
   * If there's no traffic light to run the command, stores it for later when
   * one becomes available. Logs messages appropriately.
   * @param {string} filePath - Path to the file to execute.
   * @param {boolean} [reset=false] - Whether to reset the traffic light
   *   before executing the command.
   * @param {string} [encoding='utf8'] - Encoding of the file.
   */
  async runFile(filePath, reset = false, encoding = 'utf8') {
    let command = await this._readFile(filePath, encoding);
    if (command) return this.run(command, reset);
  }

  async _readFile(filePath, encoding) {
    try {
      if (!fs.readFileAsync) fs.readFileAsync = util.promisify(fs.readFile);
      return await fs.readFileAsync(filePath, encoding);
    } catch (e) {
      this.logger.error(`error accessing file '${filePath}'`);
      this.logger.error(e.message);
      return null;
    }
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
      this.logger.log('no traffic light available');
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
    this.interpreter.cancel();
    await tl.reset();
  }

  _skipIfRunningSame(command, tl) {
    if (this.running !== command) return false;
    return true;
  }

  async _execute(command, tl, reset) {
    if (reset) await tl.reset();
    this.logger.log(`${tl}: running`);
    this.running = command;
    let res = await this.interpreter.execute(command, {tl});
    if (command === this.running) this.running = null;
    this._finishedExecution(command, tl);
    return res;
  }

  _finishedExecution(command, tl) {
    if (this.isInterrupted || !tl.isEnabled) {
      let state = this.isInterrupted ? 'interrupted' : 'disabled';
      this.logger.log(`${tl}: ${state}, suspending running command`);
      this.suspended = command;
      this.isInterrupted = false;
      this._resumeIfNeeded(); // try to resume in another traffic light
    } else {
      this.suspended = null;
      this.logger.log(`${tl}: finished`);
    }
  }

  _errorInExecution(command, tl, error) {
    if (command === this.running) this.running = null;
    this.logger.error(`${tl}: error in command`);
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
    let command = this.interpreter.lookup(commandName);
    if (!command) {
      this.logger.error(`Command not found: "${commandName}"`);
      return;
    }
    this.logger.log(this.formatter.format(command.meta));
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
 * Factory for a Commander that deals with a single physical traffic light.
 * It will get the first available traffic light for use.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
 *   a command.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @param {physical.DeviceManager} [options.manager] - The Device Manager to use.
 * @param {string|number} [options.serialNum] - The serial number of the
 *   traffic light to use, if available. Cleware USB traffic lights have
 *   a numeric serial number.
 * @returns {Commander} A single traffic light commander.
 */
Commander.single = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-traffic-light-selector');
  const selector = new SelectorCtor(options);
  const commander = new Commander({...options, selector});
  commander.manager = selector.manager;
  return commander;
};

////////////////////////////////////////////////

/**
 * Factory for a Commander that deals with multiple physical traffic lights.
 * It will greedily get all available traffic lights for use.
 * @param {object} [options] - Commander options.
 * @param {object} [options.logger=console] - A Console-like object for logging,
 *   with a log and an error function.
 * @param {commands.MetaFormatter} [options.formatter] - A formatter for the help text of
 *   a command.
 * @param {commands.Interpreter} [options.interpreter] - The Command Interpreter to use.
 * @param {physical.DeviceManager} [options.manager] - The physical Device Manager to use.
 * @returns {Commander} A multiple traffic lights commander.
 */
Commander.multi = (options = {}) => {
  const {SelectorCtor} = tryRequire('./selectors/physical-multi-traffic-light-selector');
  const selector = new SelectorCtor(options);
  const commander = new Commander({...options, selector});
  commander.manager = selector.manager;
  return commander;
};

////////////////////////////////////////////////

module.exports = {Commander};

},{"./commands/interpreter":19,"./commands/meta-formatter":20,"./traffic-light/multi-traffic-light-commands":26,"./traffic-light/traffic-light-commands":29,"fs":1,"util":7}],9:[function(require,module,exports){
const {and} = require('./validation');

/////////////////////////////////////////////////////////////////////////////

class Analyzer {

  constructor(scope) {
    this.scope = scope;
  }

  analyze(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes.map(node => {
      this.root = node;
      this.params = [];
      return this.recur(node);
    })
      .reduce((acc, val) => acc.concat(val), []) // flatten: macros can return a list of nodes
      .filter(node => !!node); // macros can remove the node by returning null
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
    let errors = new Validator(this.scope, this.params).validate(node);
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
      scope: this.scope
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

  constructor(scope, params) {
    this.scope = scope;
    this.params = params;
  }

  validate(node) {
    let name = node.name;

    let command = this.scope.lookup(name);
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
      if (isCommand(arg) && !node.value.meta.isMacro && arg.value && arg.value.meta.returns === param.validate) {
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

},{"./validation":24}],10:[function(require,module,exports){
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

function ms(ctx, [ms]) {
  return ms;
}
ms.meta = {
  name: 'ms',
  params: [{ name: 'ms', validate: isNumber }],
  returns: isNumber,
  desc: `Returns the given number of milliseconds (an identity function).`
};

function seconds(ctx, [sec]) {
  return sec * 1000;
}
seconds.meta = {
  name: 'seconds',
  params: [{ name: 'sec', validate: isNumber }],
  returns: isNumber,
  desc: `Converts the given number of seconds to milliseconds.`
};

function minutes(ctx, [min]) {
  return min * 60 * 1000;
}
minutes.meta = {
  name: 'minutes',
  params: [{ name: 'min', validate: isNumber }],
  returns: isNumber,
  desc: `Converts the given number of minutes to milliseconds.`
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
  ms, seconds, minutes,
  'do': $do,
  loop,
  repeat,
  all
};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////

},{"./cancellable":11,"./validation":24}],11:[function(require,module,exports){
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
    /** If the Cancellation Token is cancelled. Starts off as false. */
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

},{}],12:[function(require,module,exports){
const parser = require('./formatter-peg-parser');

/////////////////////////////////////////////////////////////////////////////

/**
 * A formatter for command code.
 * Inherit from this class and override the desired methods to adjust the formatting.
 * @memberof commands
 */
class CodeFormatter {

  /**
   * Formats command code.
   * @param {string} code - Command code to format.
   * @returns {string} The formatted command code.
   */
  format(code) {
    try {
      let nodes = parser.parse(code);
      return this._process(nodes).join('');
    } catch (e) {
      return code;
    }
  }

  _process(nodes) {
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    return nodes.map(node => this[`format${capitalize(node.type)}`](node.text));
  }

  /**
   * Formats parenthesis.
   * @param {string} text - Opening or closing parenthesis.
   * @returns {string} Formatted parenthesis.
   */
  formatParens(text) { return text; }

  /**
   * Formats a command name.
   * @param {string} text - Command name.
   * @returns {string} Formatted command name.
   */
  formatCommand(text) { return text; }

  /**
   * Formats a variable.
   * @param {string} text - Variable.
   * @returns {string} Formatted variable.
   */
  formatVariable(text) { return text; }

  /**
   * Formats an identifier.
   * @param {string} text - Identifier.
   * @returns {string} Formatted identifier.
   */
  formatIdentifier(text) { return text; }

  /**
   * Formats a number.
   * @param {number} num - Number.
   * @returns {string} Formatted number.
   */
  formatNumber(num) { return num.toString(); }

  /**
   * Formats a string.
   * @param {string} text - String.
   * @returns {string} Formatted string.
   */
  formatString(text) { return text; }

  /**
   * Formats a space (blanks or newlines).
   * @param {string} text - Space.
   * @returns {string} Formatted space.
   */
  formatSpace(text) { return text; }

  /**
  * Formats a comment.
  * @param {string} text - Comment text.
  * @returns {string} Formatted comment.
  */
  formatComment(text) { return text; }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { CodeFormatter };

},{"./formatter-peg-parser":16}],13:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const {isIdentifier, isString, isCommand} = require('./validation');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

function define({root, node, scope}) {
  return exec({root, node, scope, descIdx: 1, commandIdx: 2});
}

function def({root, node, scope}) {
  return exec({root, node, scope, descIdx: 0, commandIdx: 1});
}

function exec({root, node, scope, descIdx, commandIdx}) {
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

  scope.add(name, res);

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

},{"./generator":17,"./validation":24}],14:[function(require,module,exports){
const parser = require('./doc-peg-parser');

/////////////////////////////////////////////////////////////////////////////

class DocParser {

  parse(text) {
    return parser.parse(text);
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = { DocParser };

},{"./doc-peg-parser":15}],15:[function(require,module,exports){
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

      peg$c0 = function(parts) { return parts; },
      peg$c1 = function(tag, text) { return { type: 'block', tag, parts: text }; },
      peg$c2 = function(tag) { return { type: 'block', tag, parts: []   }; },
      peg$c3 = "@",
      peg$c4 = peg$literalExpectation("@", false),
      peg$c5 = function(tag) { return tag; },
      peg$c6 = /^[a-z]/i,
      peg$c7 = peg$classExpectation([["a", "z"]], false, true),
      peg$c8 = function(chars) { return chars.join(''); },
      peg$c9 = function(text) { return { type: 'untagged', parts: text }; },
      peg$c10 = function(tagged) { return tagged; },
      peg$c11 = function(string) { return { type: 'text', value: string }; },
      peg$c12 = function(contents) { return contents.join(''); },
      peg$c13 = "{@",
      peg$c14 = peg$literalExpectation("{@", false),
      peg$c15 = peg$anyExpectation(),
      peg$c16 = function(char) { return char; },
      peg$c17 = "{",
      peg$c18 = peg$literalExpectation("{", false),
      peg$c19 = "}",
      peg$c20 = peg$literalExpectation("}", false),
      peg$c21 = function(tag) { return { type: 'inline', tag, value: ''   }; },
      peg$c22 = function(tag, text) { return { type: 'inline', tag, value: text }; },
      peg$c23 = /^[ \t\r\n]/,
      peg$c24 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false),

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
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsePart();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsePart();
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c0(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsePart() {
    var s0;

    s0 = peg$parseTaggedText();
    if (s0 === peg$FAILED) {
      s0 = peg$parseUntaggedText();
    }

    return s0;
  }

  function peg$parseTaggedText() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseTag();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parse_();
      peg$silentFails--;
      if (s3 !== peg$FAILED) {
        peg$currPos = s2;
        s2 = void 0;
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseText();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c1(s1, s3);
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
      s1 = peg$parseTag();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c2(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseTag() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 64) {
      s1 = peg$c3;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c4); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseIdentifier();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c5(s2);
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
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c6.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c7); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c6.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c7); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c8(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseUntaggedText() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseText();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c9(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseText() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseTextPart();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseTextPart();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c0(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseTextPart() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseInlineTagged();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c10(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseString();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c11(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseString() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseStringContents();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseStringContents();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c12(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseStringContents() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 64) {
      s2 = peg$c3;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c4); }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c13) {
        s2 = peg$c13;
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c14); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c16(s2);
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

  function peg$parseInlineTagged() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 123) {
      s1 = peg$c17;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c18); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseTag();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 125) {
          s3 = peg$c19;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c21(s2);
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
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c17;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseTag();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          peg$silentFails++;
          s4 = peg$parse_();
          peg$silentFails--;
          if (s4 !== peg$FAILED) {
            peg$currPos = s3;
            s3 = void 0;
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseInlineText();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 125) {
                s5 = peg$c19;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c20); }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c22(s2, s4);
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

    return s0;
  }

  function peg$parseInlineText() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseInlineTextContents();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseInlineTextContents();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c12(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseInlineTextContents() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 125) {
      s2 = peg$c19;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c20); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c16(s2);
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

  function peg$parse_() {
    var s0, s1;

    s0 = [];
    s1 = peg$parseSpace();
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseSpace();
      }
    } else {
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseSpace() {
    var s0;

    if (peg$c23.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c24); }
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

},{}],16:[function(require,module,exports){
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

      peg$c0 = function(filler1, command, filler2) {
          return [
            ...filler1,
            ...command,
            ...filler2
          ];
        },
      peg$c1 = "(",
      peg$c2 = peg$literalExpectation("(", false),
      peg$c3 = ")",
      peg$c4 = peg$literalExpectation(")", false),
      peg$c5 = function(filler1, filler2, first, filler3, filler4, rest) {
          return [
            ...filler1,
            { type: 'parens', text: '(' },
            ...filler2,
            ...first,
            ...filler3,
            { type: 'parens', text: ')' },
            ...filler4,
            ...flatten(rest || [])
          ];
        },
      peg$c6 = function(name, args) {
          return [
            { type: 'command', text: name },
            ...flatten(args || [])
          ];
        },
      peg$c7 = function(filler, head, tail) {
          return [
            ...filler,
            ...head,
            ...flatten(tail || [])
          ];
        },
      peg$c8 = function(text) { return [{ type: 'variable', text }]; },
      peg$c9 = function(text) { return [{ type: 'identifier', text }]; },
      peg$c10 = function(text) { return [{ type: 'number', text }]; },
      peg$c11 = function(text) { return [{ type: 'string', text }]; },
      peg$c12 = function(filler1, command, filler2) {
          return [
            { type: 'parens', text: '(' },
            ...filler1,
            ...command,
            ...filler2,
            { type: 'parens', text: ')' }
          ]
        },
      peg$c13 = ":",
      peg$c14 = peg$literalExpectation(":", false),
      peg$c15 = function(name) { return ":" + name; },
      peg$c16 = /^[a-z_]/i,
      peg$c17 = peg$classExpectation([["a", "z"], "_"], false, true),
      peg$c18 = /^[a-z_0-9\-]/i,
      peg$c19 = peg$classExpectation([["a", "z"], "_", ["0", "9"], "-"], false, true),
      peg$c20 = function(head, tail) { return head + tail.join(''); },
      peg$c21 = /^[0-9]/,
      peg$c22 = peg$classExpectation([["0", "9"]], false, false),
      peg$c23 = function(digits) { return parseInt(digits.join(''), 10); },
      peg$c24 = "\"",
      peg$c25 = peg$literalExpectation("\"", false),
      peg$c26 = function(contents) { return '"' + contents.join('') + '"'; },
      peg$c27 = "\\",
      peg$c28 = peg$literalExpectation("\\", false),
      peg$c29 = peg$anyExpectation(),
      peg$c30 = function(char) { return char; },
      peg$c31 = /^[ \t\r\n]/,
      peg$c32 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false),
      peg$c33 = function(space) { return { type: 'space',   text: space.join('') }; },
      peg$c34 = ";",
      peg$c35 = peg$literalExpectation(";", false),
      peg$c36 = /^[^\r\n]/,
      peg$c37 = peg$classExpectation(["\r", "\n"], true, false),
      peg$c38 = /^[\r\n]/,
      peg$c39 = peg$classExpectation(["\r", "\n"], false, false),
      peg$c40 = function(comment, newline) { return { type: 'comment', text: ';' + comment.join('') + newline }; },
      peg$c41 = function(comment) { return { type: 'comment', text: ';' + comment.join('') }; },

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
          s1 = peg$c0(s1, s2, s3);
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
                    s1 = peg$c5(s1, s3, s4, s5, s7, s8);
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
          s1 = peg$c7(s1, s2, s3);
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
          s1 = peg$c10(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseString();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c11(s1);
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
                      s1 = peg$c12(s2, s3, s4);
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
      s1 = peg$c13;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c14); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseIdentifier();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c15(s2);
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
    if (peg$c16.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c17); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$c18.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (peg$c18.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c19); }
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c20(s1, s2);
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
    if (peg$c21.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c22); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c21.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c23(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseString() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c24;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c25); }
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
          s3 = peg$c24;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c25); }
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

  function peg$parseStringContents() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 34) {
      s2 = peg$c24;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c25); }
    }
    if (s2 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s2 = peg$c27;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c30(s2);
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
        s1 = peg$c27;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseEscapeChar();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c30(s2);
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
      s0 = peg$c24;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c25); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s0 = peg$c27;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
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

    s0 = peg$currPos;
    s1 = [];
    if (peg$c31.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c32); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c31.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c33(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c34;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c36.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c37); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c36.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c38.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c40(s2, s3);
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
          s1 = peg$c34;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c36.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c36.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c37); }
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseEOF();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c41(s2);
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
      if (peg$silentFails === 0) { peg$fail(peg$c29); }
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


    const flatten = arr => arr.reduce((acc, val) => acc.concat(val), []);


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

},{}],17:[function(require,module,exports){

class Generator {

  generate(nodes) {
    this.errors = [];
    if (!nodes) return null;
    nodes = nodes
      .filter(node => this.validateTopLevel(node))
      .map(node => this.recur(node));
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
    if (!command) return null;
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

const {isCommand} = require('./validation');
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

},{"./validation":24}],18:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');
const {isString} = require('./validation');
const {Analyzer} = require('./analyzer');
const {Parser} = require('./parser');

/////////////////////////////////////////////////////////////////////////////

function $import({root, node, scope}) {
  let errors = validate(node, root);
  if (errors.length > 0) return errors;

  let arg = node.args[0];
  let filePath = arg.value;

  // keep track of the visited paths in a stack (use the scope)
  let stack = scope.__stack = scope.__stack || [];

  // make sure the path is absolute
  if (stack.length > 0 && !path.isAbsolute(filePath)) {
    let baseDir = path.dirname(stack[stack.length - 1]);
    filePath = path.resolve(baseDir, filePath);
  }
  filePath = path.normalize(filePath);

  // keep track of all imported paths (use the scope)
  let paths = scope.__paths = scope.__paths || new Set();
  if (paths.has(filePath)) return null; // already imported

  // read the file contents
  try {
    var contents = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return [badFile(arg, filePath, e)];
  }

  // path was successfully imported
  paths.add(filePath);

  // parse
  let parser = new Parser({filePath});
  let nodes = parser.parse(contents);
  if (parser.errors.length > 0) return parser.errors;

  // analyze
  stack.push(filePath);
  let analyzer = new Analyzer(scope);
  nodes = analyzer.analyze(nodes);
  stack.pop();
  if (analyzer.errors.length > 0) return analyzer.errors;

  return nodes;
}

/////////////////////////////////////////////////////////////////////////////

$import.meta = {
  name: 'import',
  isMacro: true,
  params: [
    { name: 'file-path', validate: isString }
  ],
  desc: `
    Reads and executes the given commands file.
    @example
    (import "./my-command-definitions.cljs")`
};

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

function validate(node, root) {
  let errors = [];
  validatePosition(node, root, errors);
  validateFilePath(node, errors);
  return errors;
}

function validateFilePath(node, errors) {
  let arg = node.args[0];
  if (isVar(arg)) {
    errors.push(badVariable(node, arg));
  }
}

function validatePosition(node, root, errors) {
  if (node !== root) {
    errors.push(badPosition(node));
  }
}

/////////////////////////////////////////////////////////////////////////////

const badVariable = (node, arg) => {
  let param = $import.meta.params[0];
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter 1 ("${param.name}"), must be ${param.validate.exp}`
  };
};

const badPosition = node => ({
  type: 'error',
  loc: node.loc,
  text: `"${node.name}" cannot be nested`
});

const badFile = (arg, filePath, e) => ({
  type: 'error',
  loc: arg.loc,
  text: `Error opening file "${filePath}"\n${e.message}`
});

/////////////////////////////////////////////////////////////////////////////

const commands = {import: $import};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////

},{"./analyzer":9,"./parser":21,"./validation":24,"fs":1,"path":4}],19:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
const util = require('util');

/////////////////////////////////////////////////////////////////////////////

const {FlatScope} = require('./scope');
const {Parser} = require('./parser');
const {Analyzer} = require('./analyzer');
const {Generator} = require('./generator');
const {Cancellable} = require('./cancellable');

/////////////////////////////////////////////////////////////////////////////

const define = require('./define');
const $import = require('./import');
const baseCommands = require('./base-commands');

/////////////////////////////////////////////////////////////////////////////

/**
 * Command interpreter to execute command strings.
 * @memberof commands
 */
class Interpreter {

  /**
   * @param {object.<string, commands.Command>} [commands] - Commands this
   *   interpreter recognizes.
   * @param {boolean} [intrinsics=true] - Whether to add intrinsic commands
   *   to the interpreter scope (like 'define' and 'pause').
   */
  constructor(commands = {}, intrinsics = true) {
    let commandsInScope = {};
    if (intrinsics) {
      Object.assign(commandsInScope, {
        ...define.commands, // add the 'define' commands
        ...$import.commands, // add the 'import' command
        ...baseCommands.commands // add the base commands
      });
    }
    Object.assign(commandsInScope, commands);
    this.scope = new FlatScope(commandsInScope);
    this.parser = new Parser();
    this.analyzer = new Analyzer(this.scope);
    this.generator = new Generator();
    this.ct = new Cancellable();
  }

  /**
   * All commands indexed by their names.
   * @type {object.<string, commands.Command>}
   */
  get commands() {
    return this.scope.commands;
  }

  /**
   * Command names this interpreter recognizes.
   * @type {string[]}
   */
  get commandNames() {
    return this.scope.commandNames;
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.scope.add(name, command);
  }

  /**
   * Looks up a command this interpreter recognizes.
   * @param {string} name - The command name.
   * @returns {commands.Command} - The command function or `null` if the command is not found.
   */
  lookup(name) {
    return this.scope.lookup(name);
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
   * Executes a command file asynchronously.
   * @param {string} filePath - Path to the file to execute.
   * @param {string} [encoding='utf8'] - Encoding of the file.
   * @param {object} [ctx] - Context object to be passed as part of the executed
   *   commands' context, together with the cancellation token.
   *   This context cannot have key 'ct', since it would be overwritten anyway.
   * @param {commands.Cancellable} [ct] - Cancellation token.
   * @throws Throws an error for any issues accessing the file, or for any syntax
   *   or semantic errors in its text.
   * @returns {object[]} Array with the results of the executions of the commands
   *   found in the file.
   */
  async executeFile(filePath, encoding = 'utf8', ctx = {}, ct = this.ct) {
    if (!fs.readFileAsync) fs.readFileAsync = util.promisify(fs.readFile);
    return this.execute(await fs.readFileAsync(filePath, encoding), ctx, ct);
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

},{"./analyzer":9,"./base-commands":10,"./cancellable":11,"./define":13,"./generator":17,"./import":18,"./parser":21,"./scope":23,"fs":1,"util":7}],20:[function(require,module,exports){
const {DocParser} = require('./doc-parser');
const {CodeFormatter} = require('./code-formatter');

/////////////////////////////////////////////////////////////////////////////

/**
 * A formatter for a command metadata: its signature and description.
 * Inherit from this class and override the desired methods to adjust the formatting.
 * @memberof commands
 */
class MetaFormatter {

  /**
   * Creates a new instance of this class.
   * @param {commands.CodeFormatter} [codeFormatter] - Code formatter to use when formatting code samples.
   */
  constructor(codeFormatter = new CodeFormatter()) {
    this._parser = new DocParser();
    this._codeFormatter = codeFormatter;
  }

  /**
   * Formats a command's metadata.
   * @param {commands.Meta} meta - A command's metadata to format.
   * @returns {string} The formatted command's metadata: its signature and description.
   */
  format(meta) {
    return `${this.formatSignature(meta)}\n${this.formatDesc(meta.desc)}`;
  }

  /**
   * Formats a command's description.
   * @param {string} desc - A command's raw description.
   * @returns {string} The formatted command's description.
   */
  formatDesc(desc) {
    let nodes = this._parser.parse(desc);
    return this._recur(nodes);
  }

  _recur(nodes) {
    return nodes.map(node => this[`_${node.type}`](node)).join('');
  }

  _text(node) {
    return node.value;
  }

  _untagged(node) {
    let res = this._recur(node.parts);
    return this.formatTextBlock(res) + '\n';
  }

  _block(node) {
    let res = this._recur(node.parts);
    return this.formatBlockTag(res, node.tag) + '\n';
  }

  _inline(node) {
    return this.formatInlineTag(node.value, node.tag);
  }

  /**
   * Formats a block tag found in a command's description.
   * @param {string} text - The text of the tag.
   * @param {string} tag - The tag name.
   * @returns {string} The formatted block tag.
   */
  formatBlockTag(text, tag) {
    if (tag === 'example') return this.formatCode(text);
    return this.formatTextBlock(text);
  }

  /**
   * Formats an inline tag found in a command's description.
   * @param {string} text - The text of the tag.
   * @param {string} tag - The tag name.
   * @returns {string} The formatted inline tag.
   */
  formatInlineTag(text, tag) {
    if (tag === 'code') return this.formatInlineCode(text);
    return text.trim();
  }

  /**
   * Formats a description text block. Either untagged or in a block tag.
   * @param {string} text - The text block to format.
   * @returns {string} The formatted text block.
   */
  formatTextBlock(text) {
    return text
      .trim() // trim the whole text block
      .replace(/^[ \t]+/gm, '') // trim the start or each line
      .replace(/[ \t]*([\n\r]?)$/gm, '$1'); // trim the end of each line, but keep the line break
  }

  /**
   * Formats code typically found in an example tag in a command's description.
   * @param {string} code - The raw code string to format.
   * @returns {string} The formatted code.
   */
  formatCode(code) {
    code = code.replace(/^\s*$[\n\r]*/m, ''); // remove first empty lines
    let indentSize = code.search(/[^ \t]|$/); // get indent size of first line
    code = code
      .replace(new RegExp(`^[ \\t]{${indentSize}}`, 'gm'), '') // unindent
      .replace(/\s*$/, ''); // trim end
    return this._codeFormatter.format(code);
  }

  /**
   * Formats inline code in a command's description.
   * @param {string} code - The raw inline code string to format.
   * @returns {string} The formatted code.
   */
  formatInlineCode(code) {
    return `\`${code.trim()}\``;
  }

  /**
   * Formats the signature of a command.
   * @param {commands.Meta} meta - A command's metadata.
   * @returns {string} The formatted command's signature.
   */
  formatSignature(meta) {
    return `${this.formatName(meta.name)}${this.formatParams(meta.params)}${this.formatReturn(meta.returns)}`;
  }

  /**
   * Formats the name of a command.
   * @param {string} name - A command's name.
   * @returns {string} The formatted command's name.
   */
  formatName(name) {
    return name;
  }

  /**
   * Formats the parameters of a command.
   * @param {commands.Param[]} params - A command's parameters.
   * @returns {string} The formatted command's parameters.
   */
  formatParams(params) {
    if (params.length === 0) return '';
    return ' ' + params.map(param => this.formatParam(param)).join(' ');
  }

  /**
   * Formats a parameter of a command.
   * @param {commands.Param} param - A command's parameter.
   * @returns {string} The formatted command's parameter.
   */
  formatParam(param) {
    let res = `:${param.name}`;
    if (param.isRest) res += ' ...';
    return res;
  }

  /**
   * Formats the return of a command.
   * @param {commands.Validate} $return - A command's return specification.
   * @returns {string} The formatted command's return.
   */
  formatReturn($return) {
    if (!$return) return '';
    return ` -> ${$return.exp}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {
  Formatter: MetaFormatter, // alias
  MetaFormatter
};

},{"./code-formatter":12,"./doc-parser":14}],21:[function(require,module,exports){
const parser = require('./peg-parser');

/////////////////////////////////////////////////////////////////////////////

class Parser {

  constructor(options = {filePath: null}) {
    this.options = options;
  }

  parse(text) {
    this.errors = [];
    try {
      return parser.parse(text, {formatter: this});
    } catch (e) {
      this.errors.push(this.formatError(e));
      return null;
    }
  }

  formatError(e) {
    return {
      type: 'error',
      text: e.toString(),
      loc: this.formatLocation(e.location, 0)
    };
  }

  formatLocation(location, endOffset = -1) {
    let start = location.start;
    let end = location.end;
    let filePart = this.options.filePath ? `${this.options.filePath}/` : '';
    return `${filePart}${start.line}:${start.column}-${end.line}:${end.column + endOffset}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Parser};

},{"./peg-parser":22}],22:[function(require,module,exports){
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


    const formatter = options.formatter;
    const loc = () => formatter.formatLocation(location());


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

},{}],23:[function(require,module,exports){
/////////////////////////////////////////////////////////////////////////////

/**
 * A flat (non-hierarchical) scope for commands.
 * @memberof commands
 * @private
 */
class FlatScope {

  /**
   * @param {object.<string, commands.Command>} [commands] - Commands for this scope.
   */
  constructor(commands = {}) {
    this.commands = commands;
  }

  /**
   * Command names in this scope.
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this.commands);
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
  }

  /**
   * Looks up a command in this scope.
   * @param {string} name - The command name.
   * @returns {commands.Command} - The command function or `null` if the command is not found.
   */
  lookup(name) {
    return this.commands[name];
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {FlatScope};

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

function defineCommands(interpreter) {
  interpreter.add('morse', morse);
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

},{"../commands/base-commands":10,"../commands/validation":24,"./utils":31,"./validation":32}],26:[function(require,module,exports){
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

const {
  isNumber
} = require('../commands/validation');

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function use({tl, ct}, [...indexes]) {
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

function defineCommands(interpreter) {
  // add multi commands
  interpreter.add('use', use);
  interpreter.add('use-next', useNext);
  interpreter.add('use-previous', usePrevious);
  interpreter.add('use-last', useLast);
  interpreter.add('use-near', useNear);
  interpreter.add('use-all', useAll);
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

},{"../commands/validation":24}],27:[function(require,module,exports){
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
   * Tries to check out the provided traffic lights.
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

},{"./traffic-light":30}],28:[function(require,module,exports){
; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(interpreter) { interpreter.execute(`
;------------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  @example
  (lights off off on)"
  (do
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);interpreter.execute(`;-----------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  @example
  (flash red 500)"
  (do
    (toggle :light) (pause :ms)
    (toggle :light) (pause :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define blink
  "Flashes a light for the given number of times and duration for each time:
  @example
  (blink 10 yellow 500)"
  (repeat :times
    (flash :light :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define twinkle
  "Flashes a light for the given duration forever:
  @example
  (twinkle green 500)"
  (loop
    (flash :light :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define cycle
  "Blinks each light in turn for the given duration and number of times,
  repeating forever; starts with red:
  @example
  (cycle 2 500)"
  (loop
    (blink :times red    :ms)
    (blink :times yellow :ms)
    (blink :times green  :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define jointly
  "Flashes all lights together forever:
  @example
  (jointly 500)"
  (loop
    (lights on  on  on)  (pause :ms)
    (lights off off off) (pause :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define heartbeat
  "Heartbeat pattern:
  @example
  (heartbeat red)"
  (loop
    (blink 2 :light 250)
    (pause 350)))

;`);interpreter.execute(`;-----------------------------------------------------

(define pulse
  "Single pulse pattern:
  @example
  (pulse red)"
  (loop
    (toggle :light)
    (pause 300)
    (toggle :light)
    (pause 1500)))

;`);interpreter.execute(`;-----------------------------------------------------

(define count
  "Count a number of times repeatedly:
  @example
  (count 7 red)"
  (loop
    (blink :times :light 200)
    (pause 800)))

;`);interpreter.execute(`;-----------------------------------------------------

(define sos
  "SOS distress signal morse code pattern:
  @example
  (sos red)"
  (loop
    (morse :light "SOS")))

;`);interpreter.execute(`;-----------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);interpreter.execute(`;-----------------------------------------------------

(define up
  "Go up with the given duration:
  @example
  (up 200)"
  (do
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);interpreter.execute(`;-----------------------------------------------------

(define down
  "Go down with the given duration:
  @example
  (down 200)"
  (do
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle green)  (pause :ms) (toggle green)))

;`);interpreter.execute(`;-----------------------------------------------------

(define bounce
  "Bounce with the given duration:
  @example
  (bounce 500)"
  (loop
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)))

;`);interpreter.execute(`;-----------------------------------------------------

(define activity
  "Time an activity from green (go) to yellow (attention) to red (stop).
  Blinks green before starting for 5 seconds, keeps green on for the {@code green-ms}
  duration, turns yellow on for the {@code yellow-ms} duration, then blinks yellow
  for {@code attention-ms} duration before turning on red (stop).
  E.g. for an activity that takes one minute with green for 40s, yellow for 10s,
  then yellow blinking for 10s:
  @example
  (activity
    (seconds 40)
    (seconds 10)
    (seconds 10))"
  (do
    (blink 4 green 500)
    (turn green on)
    (pause :green-ms)
    (lights off on off)
    (pause :yellow-ms)
    (turn yellow off)
    (timeout :attention-ms (twinkle yellow 500))
    (lights on off off)))

;`); }//-----------------------------------------------------------------------

},{}],29:[function(require,module,exports){
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

function defineCommands(interpreter) {
  // add base commands
  interpreter.add('toggle', toggle);
  interpreter.add('turn', turn);
  interpreter.add('reset', reset);
  // add other commands
  require('./morse').defineCommands(interpreter);
  // add higher-level commands
  require('./traffic-light-commands.cljs')(interpreter);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  toggle, turn, reset,
  defineCommands
};

},{"./morse":25,"./traffic-light-commands.cljs":28,"./utils":31,"./validation":32}],30:[function(require,module,exports){
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

},{"events":2}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
const {MetaFormatter} = require('../src/commands/meta-formatter');
const {CodeFormatter} = require('../src/commands/code-formatter');

const fs = require('fs');
fs.readFileSync = () => { throw new Error('Reading files only works in "node"'); };

////////////////////////////////////////////////////////

class WebCodeFormatter extends CodeFormatter {

  formatIdentifier(text) {
    if (['red', 'yellow', 'green'].indexOf(text) >= 0) {
      return `<span class='code-identifier-${text}'>${text}</span>`;
    }
    return `<span class='code-identifier'>${text}</span>`;
  }

}
{
  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
  const def = type => WebCodeFormatter.prototype[`format${capitalize(type)}`] =
    function(text) { return `<span class='code-${type}'>${text}</span>`; };
  def('command'); // WebCodeFormatter.prototype.formatCommand(text) { return `<span class='code-command'>${text}</span>`; }
  def('variable'); // ...
  def('number');
  def('string');
  def('comment');
}

////////////////////////////////////////////////////////

let defaultFormatter = new MetaFormatter();

class WebMetaFormatter extends MetaFormatter {

  constructor() {
    super(new WebCodeFormatter());
  }

  formatSignature(meta) {
    return `<h3><code>${super.formatSignature(meta)}</code></h3>`;
  }

  formatCode(code) {
    let executable = defaultFormatter.formatCode(code)
      .replace(/\\/g, '&#92;')
      .replace(/"/g, '&quot;');
    let formatted = super.formatCode(code)
      .replace(/^([ \t]+)/gm, (_, spaces) => spaces.replace(/\s/g, '&nbsp;')) // indentation
      .replace(/\n/g, '<br/>\n');
    return `<br/><br/><div class="sample" data-sample="${executable}">${formatted}</div>`;
  }

  formatInlineCode(text) {
    return `<code class="variable">${text}</code>`;
  }

}

////////////////////////////////////////////////////////

function setUpHelp(commander, runCommand) {
  let formatter = new WebMetaFormatter();
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commandNames = commander.commandNames;
  for (let i = 0; i < commandNames.length; ++i) {
    let commandName = commandNames[i];
    let command = commander.commands[commandName];
    divHelp.innerHTML += formatter.format(command.meta);
  }
  setUpSamples(runCommand);
}

////////////////////////////////////////////////////////

function setUpSamples(runCommand) {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.getAttribute('data-sample'));
      location.hash = '#_';
    }));
}

////////////////////////////////////////////////////////

module.exports = {
  setUpHelp
};

},{"../src/commands/code-formatter":12,"../src/commands/meta-formatter":20,"fs":1}],34:[function(require,module,exports){
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
  if (commandStr.match(/def(ine)?/)) {
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

},{"../src/commander":8,"./help":33,"./web-traffic-light":35}],35:[function(require,module,exports){
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

},{"../src/traffic-light/multi-traffic-light":27,"../src/traffic-light/multi-traffic-light-commands":26,"../src/traffic-light/traffic-light":30,"events":2}]},{},[34]);
