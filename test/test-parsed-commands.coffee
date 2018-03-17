{Light, TrafficLight} = require '../src/traffic-light'
{CommandParser} = require '../src/command-parser'
{Cancellable} = require '../src/cancellable'
c = require '../src/commands'
require('chai').should()
sinon = require('sinon')

describe 'Parsed commands', () =>

  beforeEach () =>
    # context for execution
    tl = new TrafficLight
    ct = new Cancellable
    scope = {}
    @ctx = {tl, ct, scope}
    # commands
    @wait = sinon.stub()
    @wait.validation = [(n) -> typeof n is 'number']
    @turn = sinon.stub()
    @turn.doc = usage: 'turn [left|right]'
    @turn.validation = [(d) -> d is 'left' or d is 'right']
    @commands = {@wait, @turn, run:c.run}
    # parser
    cp = new CommandParser(@commands)
    @exec = (cmd) => cp.execute(cmd, tl, ct, scope)

  describe 'define', () =>

    beforeEach () =>
      @commands.define = c.define

    it 'define a new command', () =>
      await @exec 'define turnLeft (turn left)'
      await @exec 'turnLeft'
      @turn.calledOnceWith(@ctx, ['left']).should.be.true

    it 'define with a variable', () =>
      await @exec 'define go (turn :direction)'
      await @exec 'go left'
      @turn.calledOnceWith(@ctx, ['left']).should.be.true

    it 'define complex command', () =>
      await @exec 'define left_and_right (run (turn left) (wait 50) (turn right))'
      await @exec 'left_and_right'
      @turn.calledTwice.should.be.true
      @turn.calledWith(@ctx, ['left']).should.be.true
      @turn.calledWith(@ctx, ['right']).should.be.true
      @wait.calledOnceWith(@ctx, [50]).should.be.true

    it 'define complex command with variables', () =>
      await @exec 'define turn_wait_turn (run (turn :d1) (wait :ms) (turn :d2))'
      await @exec 'turn_wait_turn right 42 left'
      @turn.calledTwice.should.be.true
      @turn.calledWith(@ctx, ['right']).should.be.true
      @turn.calledWith(@ctx, ['left']).should.be.true
      @wait.calledOnceWith(@ctx, [42]).should.be.true

    it 'define complex command with shared variables', () =>
      await @exec 'define turn_wait_turn_again (run (turn :d) (wait :ms) (turn :d))'
      await @exec 'turn_wait_turn_again right 42'
      @turn.calledTwice.should.be.true
      @turn.getCall(0).calledWith(@ctx, ['right']).should.be.true
      @turn.getCall(1).calledWith(@ctx, ['right']).should.be.true
      @wait.calledOnceWith(@ctx, [42]).should.be.true

    describe 'errors', () =>

      it 'define a new command: error in the definition', () =>
        exec = () => @exec 'define turnUp (turn up)'
        exec.should.throw 'Check your arguments: turn [left|right]'

      xit 'define a new command: error in the execution', () =>
        await @exec 'define turnLeft (turn left)'
        exec = () => @exec 'turnLeft 40' # doesn't take any arguments
        exec.should.throw 'Check your arguments: turnLeft'
