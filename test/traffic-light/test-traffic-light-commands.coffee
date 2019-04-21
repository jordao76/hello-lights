require '../setup-unhandled-rejection'
{Light, TrafficLight} = require '../../src/traffic-light/traffic-light'
{Interpreter} = require '../../src/commands/interpreter'
{Cancellable} = require '../../src/commands/cancellable'
{defineCommands} = require '../../src/traffic-light/traffic-light-commands'
require('chai').should()
sinon = require('sinon')

describe 'Traffic light commands', () =>

  beforeEach () =>
    # context for execution
    @tl = new TrafficLight
    @ct = new Cancellable
    scope = {}
    @ctx = {@tl, @ct, scope}
    @interpreter = new Interpreter()
    defineCommands(@interpreter)
    @commands = @interpreter.commands
    @exec = (cmd, tl=@tl, ct=@ct) => @interpreter.execute(cmd, {tl}, ct, scope)

  describe 'lights', () =>

    it 'should turn lights on and off', () =>
      await @exec 'lights on on on', @tl
      @tl.red.on.should.be.true
      @tl.yellow.on.should.be.true
      @tl.green.on.should.be.true
      await @exec 'lights off off off', @tl
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
      await @exec 'lights on off off', @tl
      @tl.red.on.should.be.true
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
      await @exec 'lights off off off', @tl
      await @exec 'lights off on off', @tl
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.true
      @tl.green.on.should.be.false
      await @exec 'lights off off off', @tl
      await @exec 'lights off off on', @tl
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.true

    it 'should NOT turn lights on when already cancelled', () =>
      ct = isCancelled: true
      await @exec 'lights on on on', @tl, ct
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
