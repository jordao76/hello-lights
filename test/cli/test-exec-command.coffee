expect = require('chai').expect
sinon = require 'sinon'
yargs = require '../../src/cli/yargs'
commanderOptions = require '../../src/cli/commander-options'

describe 'exec-command', () ->

  beforeEach () ->
    @run = sinon.spy()
    @close = sinon.stub()
    @mockCommander = { @run, @close }
    @resolveCommander = sinon.stub(commanderOptions, 'resolveCommander')
      .returns @mockCommander

  afterEach () ->
    @resolveCommander.restore()

  it 'executes the given command', () ->
    yargs.parse 'exec hello', (err, argv, output) =>
      expect(err).to.be.null
      sinon.assert.calledWith @run, 'hello'

  it 'executes the given multi-string command', () ->
    yargs.parse 'exec hello lights', (err, argv, output) =>
      expect(err).to.be.null
      sinon.assert.calledWith @run, 'hello lights'

  it 'empty command', () ->
    yargs.parse 'exec', (err, argv, output) =>
      expect(err.message).to.include 'Not enough non-option arguments'
      sinon.assert.callCount @run, 0
