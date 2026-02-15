# hello-lights

[![npm](https://img.shields.io/npm/v/hello-lights.svg)](https://www.npmjs.com/package/hello-lights)
[![CI](https://github.com/jordao76/hello-lights/actions/workflows/pr.yml/badge.svg)](https://github.com/jordao76/hello-lights/actions/workflows/pr.yml)
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

For the `Commander` class documentation look [here](https://jordao76.github.io/hello-lights/doc/Commander.html).

## Commands

Check out the available commands [here](https://jordao76.github.io/hello-lights). For multiple traffic lights (`Commander.multi`) look [here](https://jordao76.github.io/hello-lights/multi.html).

## Documentation

For the documentation look [here](https://jordao76.github.io/hello-lights/doc/index.html).

## License

Licensed under the [MIT license](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md).
