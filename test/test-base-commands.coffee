{Light, TrafficLight} = require '../src/traffic-light'
{CommandParser} = require '../src/command-parser'
{Cancellable} = require '../src/cancellable'
c = require '../src/base-commands'
defineCommands = require '../src/traffic-light-commands.cljs'
require('chai').should()
sinon = require 'sinon'
nativeSetTimeout = setTimeout
yieldThen = (fn) -> nativeSetTimeout(fn, 0)

describe 'Commands', () =>

  describe 'Timing commands', () =>

    beforeEach () => @clock = sinon.useFakeTimers()
    afterEach () => @clock.restore()

    describe 'pause', () =>

      it 'should pause for 500ms', (done) =>
        paused = false
        run = () ->
          await c.pause [500]
          paused = true
        run().then () ->
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 500

      it 'should be cancellable', (done) =>
        paused = false
        run = () ->
          await c.pause [5000]
          paused = true
        run().then () ->
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 4000
        c.cancel()

    describe 'timeout', () =>

      beforeEach () =>
        @tl = new TrafficLight
        @light = @tl.red
        @token = null

      it 'should cancel when the timeout is reached', (done) =>
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [25000]
          await c.timeout {@tl}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.true
          done()
        @clock.tick 6000

      it 'the timeout itself should be cancellable', (done) =>
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [25000]
          await c.timeout {@tl}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.true
          done()
        c.cancel()

      it 'should NOT cancel when the command ends before the timeout', (done) =>
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [250]
          await c.timeout {@tl}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.false
          done()
        @clock.tick 250
        yieldThen () => @clock.tick 250

  describe 'Define', () =>

    beforeEach () =>
      # context for execution
      @tl = new TrafficLight
      @ct = new Cancellable
      scope = {}
      @ctx = {@tl, @ct, scope}
      # validation functions
      isNumber = (n) -> typeof n is 'number'
      isNumber.exp = 'a number'
      @isDirection = (d) -> d is 'left' or d is 'right'
      @isDirection.exp = '"left" or "right"'
      # stubbed pause command
      @pause = sinon.stub()
      @pause.doc = name: 'pause'
      @pause.paramNames = ['ms']
      @pause.validation = [isNumber]
      # move command
      @move = sinon.stub()
      @move.doc = name: 'move'
      @move.paramNames = ['where']
      @move.validation = [@isDirection]
      @commands = {...c, @move}
      @commands.pause = @pause # replace c.pause with the stub
      # parser
      cp = new CommandParser(@commands)
      defineCommands(cp) # load "defined" commands
      @exec = (cmd, tl=@tl, ct=@ct) => cp.execute(cmd, {tl}, ct, scope)

    it 'define a new command', () =>
      moveLeft = await @exec 'define move-left "Moves left." (move left)'
      # check metadata
      moveLeft.doc.name.should.equal 'move-left'
      moveLeft.doc.desc.should.equal 'Moves left.'
      moveLeft.paramNames.should.deep.equal []
      # execute
      await @exec 'move-left'
      @move.calledOnceWith(@ctx, ['left']).should.be.true

    it 'define with a variable', () =>
      go = await @exec 'define go "Just go." (move :direction)'
      # check metadata
      go.doc.name.should.equal 'go'
      go.doc.desc.should.equal 'Just go.'
      go.paramNames.should.deep.equal ['direction']
      #TODO go.validations.should.deep.equal [@isDirection]
      # execute
      await @exec 'go left'
      @move.calledOnceWith(@ctx, ['left']).should.be.true

    it 'define complex command', () =>
      await @exec 'define left-and-right "Left and right." (run (move left) (pause 50) (move right))'
      await @exec 'left-and-right'
      @move.calledTwice.should.be.true
      @move.calledWith(@ctx, ['left']).should.be.true
      @move.calledWith(@ctx, ['right']).should.be.true
      @pause.calledOnceWith(@ctx, [50]).should.be.true

    it 'define complex command with variables', () =>
      await @exec 'define move-pause-move "Move twice." (run (move :d1) (pause :ms) (move :d2))'
      await @exec 'move-pause-move right 42 left'
      @move.calledTwice.should.be.true
      @move.calledWith(@ctx, ['right']).should.be.true
      @move.calledWith(@ctx, ['left']).should.be.true
      @pause.calledOnceWith(@ctx, [42]).should.be.true

    it 'define complex command with shared variables', () =>
      await @exec 'define move-pause-move-again "Move twice." (run (move :d) (pause :ms) (move :d))'
      await @exec 'move-pause-move-again right 42'
      @move.calledTwice.should.be.true
      @move.getCall(0).calledWith(@ctx, ['right']).should.be.true
      @move.getCall(1).calledWith(@ctx, ['right']).should.be.true
      @pause.calledOnceWith(@ctx, [42]).should.be.true

    it 'define two commands at once, the second uses the first', () =>
      await @exec '''

        (define move-left
          "Moves left."
          (move left))

        (define move-back
          "Moves back."
          (run
            (move-left) (move-left)))

      '''
      await @exec 'move-back'
      sinon.assert.calledTwice(@move)
      sinon.assert.calledWith(@move, @ctx, ['left'])

    describe 'errors', () =>

      it 'define a new command: error in the definition', () =>
        msg = 'Bad value "up" to "move" parameter 1 ("where"); must be: "left" or "right"'
        @exec('define move-up "Move up." (move up)').catch (e) ->
          e.message.should.equal msg

      it 'define a new command: error in the execution', () =>
        await @exec('define move-left "Move left." (move left)')
        msg = 'Bad number of arguments to "move-left"; it takes 0 but was given 1'
        @exec('move-left 40').catch (e) ->
          e.message.should.equal msg
