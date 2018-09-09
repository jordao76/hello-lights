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

The main commands are:

### toggle :light
Toggles the given light:
`toggle green`

### turn :light :state
Turns the given light on or off:
`turn green on`

### reset
Sets all lights to off.

### lights :red :yellow :green
Set the lights to the given values (on or off):
`lights off off on`

### flash :light :ms
Flashes a light for the given duration.
Toggle, wait, toggle back, wait again:
`flash red 500`

### blink :times :light :ms
Flashes a light for the given number of times and duration for each time:
`blink 10 yellow 500`

### twinkle :light :ms
Flashes a light for the given duration forever:
`twinkle green 500`

### cycle :times :ms
Blinks each light in turn for the given duration and number of times, repeating forever; starts with red:
`cycle 2 500`

### jointly :ms
Flashes all lights together forever:
`jointly 500`

### heartbeat :light
Heartbeat pattern: `heartbeat red`

### pulse :light
Single pulse pattern: `pulse red`

### count :times :light
Count a number of times repeatedly: `count 7 red`

### sos :light
SOS distress signal morse code pattern:
`sos red`

### danger
Twinkle red with 400ms flashes.

### bounce :ms
Bounces through the lights with the given duration between them:
`bounce 500`

### soundbar :ms
Just like a sound bar with the given duration:
`soundbar 500`

<a name="Commander"></a>

## Commander
Issues commands to control a connected traffic light.

**Kind**: global class  

* [Commander](#Commander)
    * [new Commander([options])](#new_Commander_new)
    * [.close()](#Commander+close)
    * [.devicesInfo()](#Commander+devicesInfo) ⇒ [<code>Array.&lt;DeviceInfo&gt;</code>](#DeviceInfo)
    * [.logDevicesInfo()](#Commander+logDevicesInfo)
    * [.cancel()](#Commander+cancel)
    * [.run(command, [reset])](#Commander+run)
    * [.commands()](#Commander+commands) ⇒ <code>Array.&lt;string&gt;</code>
    * [.help(commandName)](#Commander+help)

<a name="new_Commander_new"></a>

### new Commander([options])
Creates a new Commander instance.
Checks-out and uses the first available traffic light to issue commands.
An available traffic light is a connected traffic light that hasn't
been checked-out by another Commander instance.

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Commander options. |
| [options.logger] | <code>Object</code> | A Console-like object for logging, with   a log and an error function. |

<a name="Commander+close"></a>

### commander.close()
Called to close this instance and to stop monitoring for devices.
Should be done as the last operation before exiting the process.

**Kind**: instance method of [<code>Commander</code>](#Commander)  

<a name="Commander+devicesInfo"></a>

### commander.devicesInfo() ⇒ [<code>Array.&lt;DeviceInfo&gt;</code>](#DeviceInfo)
Returns information about known devices.
Known devices are either connected devices or
devices that were once connected and then got disconnected.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
**Returns**: [<code>Array.&lt;DeviceInfo&gt;</code>](#DeviceInfo) - Device info list.  
<a name="Commander+logDevicesInfo"></a>

### commander.logDevicesInfo()
Logs information about known devices.
Known devices are either connected devices or
devices that were once connected and then got disconnected.

**Kind**: instance method of [<code>Commander</code>](#Commander)  
**See**: Commander#devicesInfo  
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
If there's no connected device, stores the command for execution if
a device is connected later. Logs messages appropriately.

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
| commandName | <code>string</code> | Name of the command to log help info.   If it's not one of the supported commands, does nothing. |

<a name="DeviceInfo"></a>

## DeviceInfo : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The type of the device. |
| serialNum | <code>string</code> / <code>number</code> | The serial number of the device. |
| status | <code>string</code> | The status of the device, either   'connected' or 'disconnected'. |

## License

Licensed under the [MIT license](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md).
