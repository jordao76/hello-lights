# hello-lights

[![npm](https://img.shields.io/npm/v/hello-lights.svg)](https://www.npmjs.com/package/hello-lights)
[![Build Status](https://travis-ci.org/jordao76/hello-lights.svg)](https://travis-ci.org/jordao76/hello-lights)
[![Dependency Status](https://david-dm.org/jordao76/hello-lights.svg)](https://david-dm.org/jordao76/hello-lights)
[![devDependency Status](https://david-dm.org/jordao76/hello-lights/dev-status.svg)](https://david-dm.org/jordao76/hello-lights#info=devDependencies)
[![License](http://img.shields.io/:license-mit-blue.svg)](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md)

> Commands to control a traffic light

Works with a [Cleware USB traffic light](http://www.cleware.info/data/usbtischampel_E.html).

## Install

```sh
$ npm install hello-lights --save
```

## Usage

Issue commands to control a connected traffic light:

```js
const {Commander} = require('hello-lights');

let commander = new Commander();

// keeps flashing the red light in 400ms intervals
commander.run('twinkle red 400');
```

## Commands

Check out the available commands [here](https://jordao76.github.io/hello-lights). You can even create your own.

<a name="Commander"></a>

## Commander
Issues commands to control a traffic light.

**Kind**: global class  

* [Commander](#Commander)
    * [new Commander([options])](#new_Commander_new)
    * [.close()](#Commander+close)
    * [.cancel()](#Commander+cancel)
    * [.run(command, [reset])](#Commander+run)
    * [.commands()](#Commander+commands) ⇒ <code>Array.&lt;string&gt;</code>
    * [.help(commandName)](#Commander+help)
    * [.logInfo()](#Commander+logInfo)

<a name="new_Commander_new"></a>

### new Commander([options])
Creates a new Commander instance.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Commander options. |
| [options.logger] | <code>Object</code> | <code>console</code> | A Console-like object for logging,   with a log and an error function. |
| [options.serialNum] | <code>string</code> &#124; <code>number</code> |  | The serial number of the   traffic light to use, if available. Cleware USB traffic lights have   a numeric serial number. |

<a name="Commander+close"></a>

### commander.close()
Called to close this instance.
Should be done as the last operation before exiting the process.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
<a name="Commander+cancel"></a>

### commander.cancel()
Cancels any currently executing command.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
<a name="Commander+run"></a>

### commander.run(command, [reset])
Executes a command asynchronously.
If the same command is already running, does nothing.
If another command is running, cancels it, resets the traffic light,
and runs the new command.
If no command is running, executes the given command, optionally
resetting the traffic light based on the `reset` parameter.
If there's no traffic light to run the command, stores it for later when
one becomes available. Logs messages appropriately.

**Kind**: instance method of [<code>Commander</code>](#Commander)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| command | <code>string</code> |  | Command to execute. |
| [reset] | <code>boolean</code> | <code>false</code> | Whether to reset the traffic light   before executing the command. |

<a name="Commander+commands"></a>

### commander.commands() ⇒ <code>Array.&lt;string&gt;</code>
Returns a list of supported command names.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
**Returns**: <code>Array.&lt;string&gt;</code> - List of supported command names.  
<a name="Commander+help"></a>

### commander.help(commandName)
Logs the help info for the given command name.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
**See**: Commander#commands  

| Param | Type | Description |
| --- | --- | --- |
| commandName | <code>string</code> | Name of the command to log help info. |

<a name="Commander+logInfo"></a>

### commander.logInfo()
Logs information about known traffic lights.

**Kind**: instance method of [<code>Commander</code>](#Commander)  

## License

Licensed under the [MIT license](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md).
