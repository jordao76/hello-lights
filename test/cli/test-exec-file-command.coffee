expect = require('chai').expect
sinon = require 'sinon'
yargs = require '../../src/cli/yargs'
commanderOptions = require '../../src/cli/commander-options'

describe 'exec-file-command', () ->

  beforeEach () ->
    @runFile = sinon.spy()
    @close = sinon.stub()
    @mockCommander = { @runFile, @close }
    @resolveCommander = sinon.stub(commanderOptions, 'resolveCommander')
      .returns @mockCommander

  afterEach () ->
    @resolveCommander.restore()

  it 'executes the given file', () ->
    yargs.parse 'exec-file ./hello-file.cljs', (err, argv, output) =>
      expect(err).to.be.null
      sinon.assert.calledWith @runFile, './hello-file.cljs'

  it 'no file given', () ->
    yargs.parse 'exec-file', (err, argv, output) =>
      expect(err.message).to.include 'Not enough non-option arguments'
      sinon.assert.callCount @runFile, 0
