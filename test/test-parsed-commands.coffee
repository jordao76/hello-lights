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
    # validation functions
    isNumber = (n) -> typeof n is 'number'
    isNumber.exp = 'a number'
    @isDirection = (d) -> d is 'left' or d is 'right'
    @isDirection.exp = '"left" or "right"'
    # wait command
    @wait = sinon.stub()
    @wait.doc = name: 'wait'
    @wait.paramNames = ['ms']
    @wait.validation = [isNumber]
    # turn command
    @turn = sinon.stub()
    @turn.doc = name: 'turn'
    @turn.paramNames = ['where']
    @turn.validation = [@isDirection]
    @commands = {@wait, @turn, run:c.run}
    # parser
    cp = new CommandParser(@commands)
    @exec = (cmd) => cp.execute(cmd, tl, ct, scope)

  describe 'define', () =>

    beforeEach () =>
      @commands.define = c.define

    it 'define a new command', () =>
      turnLeft = await @exec 'define turnLeft (turn left)'
      # check metadata
      turnLeft.doc.name.should.equal 'turnLeft'
      turnLeft.paramNames.should.deep.equal []
      # execute
      await @exec 'turnLeft'
      @turn.calledOnceWith(@ctx, ['left']).should.be.true

    it 'define with a variable', () =>
      go = await @exec 'define go (turn :direction)'
      # check metadata
      go.doc.name.should.equal 'go'
      go.paramNames.should.deep.equal ['direction']
      #TODO go.validations.should.deep.equal [@isDirection]
      # execute
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
        exec.should.throw 'Bad value "up" to "turn" parameter 1 ("where"); must be: "left" or "right"'

      it 'define a new command: error in the execution', () =>
        await @exec 'define turnLeft (turn left)'
        exec = () => @exec 'turnLeft 40'
        exec.should.throw 'Bad number of arguments to "turnLeft"; it takes 0 but was given 1'
