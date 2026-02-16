# hello-lights

[![npm](https://img.shields.io/npm/v/hello-lights.svg)](https://www.npmjs.com/package/hello-lights)
[![CI](https://github.com/jordao76/hello-lights/actions/workflows/ci.yml/badge.svg)](https://github.com/jordao76/hello-lights/actions/workflows/ci.yml)
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

## Development

Install dependencies:

```sh
$ npm install
```

### npm scripts

| Script | Description |
|---|---|
| `npm test` | Run all tests (generates PEG parsers first) |
| `npm run lint` | Lint source and test files |
| `npm run coverage` | Run tests with coverage instrumentation |
| `npm run coverage:text` | Print a text coverage summary to the terminal |
| `npm run coverage:open` | Generate and open an HTML coverage report |
| `npm run build:doc` | Generate JSDoc documentation into `web/doc/` |
| `npm run build:web` | Build all web assets (PEG parsers, browserify bundle, docs) |
| `npm run doc` | Build and open the documentation in the browser |
| `npm run web` | Build and open the browser demo |
| `npm run mocha-grep <pattern>` | Run only tests matching a pattern |
| `npm run cli` | Run the CLI locally |

### CLI

Run the CLI locally with `npm run cli`:

```sh
$ npm run cli -- exec bounce 300       # execute a command
$ npm run cli -- exec-file ./cmds.clj  # execute commands from a file
$ npm run cli -- repl                  # start an interactive REPL
$ npm run cli -- serve                 # start the HTTP server on port 9000
$ npm run cli -- serve --port 3000     # start the HTTP server on a custom port
```

Use `--help` for the full list of options, including `--serial-num` to target a specific device and `--selector multi` to control multiple traffic lights at once.

## CI

The [CI workflow](.github/workflows/ci.yml) runs on every push and pull request to `master`. It has two jobs:

- **Build** -- lints, runs tests with coverage, and builds all web assets.
- **Deploy** -- on push to `master`, deploys the `web/` directory to GitHub Pages using the `actions/deploy-pages` action.

## License

Licensed under the [MIT license](https://github.com/jordao76/hello-lights/blob/master/LICENSE.md).
