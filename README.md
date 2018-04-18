# hello-lights

[![npm](https://img.shields.io/npm/v/hello-lights.svg)](https://www.npmjs.com/package/hello-lights)
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
commander.run(`twinkle red 400`);
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

## License

Licensed under the [MIT license](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md).
