expect = require('chai').expect
sinon = require 'sinon'
yargs = require '../../src/cli/yargs'
commanderOptions = require '../../src/cli/commander-options'
repl = require 'repl'

describe 'repl-command', () ->

  beforeEach () ->
    server = on: sinon.stub()
    @start = sinon.stub(repl, 'start').returns server
    @run = sinon.spy()
    @mockCommander = {
      commandNames: ['cmd1', 'cmd2']
      @run,
      manager: {}
      logger: { log: sinon.stub() }
    }
    @resolveCommander = sinon.stub(commanderOptions, 'resolveCommander')
      .returns @mockCommander

  afterEach () ->
    @start.restore()
    @resolveCommander.restore()

  it 'launches the repl', () ->
    yargs.parse 'repl', (err, argv, output) =>
      expect(err).to.be.null
      sinon.assert.calledOnce @start
