{Light, TrafficLight} = require '../src/traffic-light'
{CommandParser} = require '../src/command-parser'
{Cancellable} = require '../src/cancellable'
baseCommands = require '../src/base-commands'
defineCommands = require '../src/traffic-light-commands.cljs'
require('chai').should()
sinon = require('sinon')

describe 'Traffic light commands', () =>

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
    @commands = {...baseCommands, @move}
    @commands.pause = @pause # replace baseCommands.pause with the stub
    # parser
    cp = new CommandParser(@commands)
    defineCommands(cp); # parse and load "defined" commands
    @exec = (cmd, tl=@tl, ct=@ct) => cp.execute(cmd, tl, ct, scope)

  describe 'defining', () => # TODO: belongs test-base-commands

    it 'define a new command', () =>
      moveLeft = await @exec 'define moveLeft "Moves left." (move left)'
      # check metadata
      moveLeft.doc.name.should.equal 'moveLeft'
      moveLeft.doc.desc.should.equal 'Moves left.'
      moveLeft.paramNames.should.deep.equal []
      # execute
      await @exec 'moveLeft'
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
      await @exec 'define left_and_right "Left and right." (run (move left) (pause 50) (move right))'
      await @exec 'left_and_right'
      @move.calledTwice.should.be.true
      @move.calledWith(@ctx, ['left']).should.be.true
      @move.calledWith(@ctx, ['right']).should.be.true
      @pause.calledOnceWith(@ctx, [50]).should.be.true

    it 'define complex command with variables', () =>
      await @exec 'define move_pause_move "Move twice." (run (move :d1) (pause :ms) (move :d2))'
      await @exec 'move_pause_move right 42 left'
      @move.calledTwice.should.be.true
      @move.calledWith(@ctx, ['right']).should.be.true
      @move.calledWith(@ctx, ['left']).should.be.true
      @pause.calledOnceWith(@ctx, [42]).should.be.true

    it 'define complex command with shared variables', () =>
      await @exec 'define move_pause_move_again "Move twice." (run (move :d) (pause :ms) (move :d))'
      await @exec 'move_pause_move_again right 42'
      @move.calledTwice.should.be.true
      @move.getCall(0).calledWith(@ctx, ['right']).should.be.true
      @move.getCall(1).calledWith(@ctx, ['right']).should.be.true
      @pause.calledOnceWith(@ctx, [42]).should.be.true

    xit 'define two commands at once, the second uses the first', () =>
      await @exec '''
        (define moveLeft
          "Moves left."
          (move left))
        (define moveBack
          "Moves back."
          (run
            (moveLeft) (moveLeft)))
      '''
      await @exec 'moveBack'
      @move.calledTwiceWith(@ctx, ['left']).should.be.true

    describe 'errors', () =>

      it 'define a new command: error in the definition', () =>
        exec = () => @exec 'define moveUp "Move up the radio." (move up)'
        exec.should.throw 'Bad value "up" to "move" parameter 1 ("where"); must be: "left" or "right"'

      it 'define a new command: error in the execution', () =>
        await @exec 'define moveLeft "Move left." (move left)'
        exec = () => @exec 'moveLeft 40'
        exec.should.throw 'Bad number of arguments to "moveLeft"; it takes 0 but was given 1'

  describe 'lights', () =>

    it 'check the metadata', () =>
      @commands.lights.doc.name.should.equal 'lights'
      @commands.lights.doc.desc.should.contain 'Set the lights'
      @commands.lights.paramNames.should.deep.equal ['red', 'yellow', 'green']

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

  describe 'flash', () =>

    it 'check the metadata', () =>
      @commands.flash.doc.name.should.equal 'flash'
      @commands.flash.doc.desc.should.contain 'Flashes a light'
      @commands.flash.paramNames.should.deep.equal ['light', 'ms']

  describe 'blink', () =>

    it 'check the metadata', () =>
      @commands.blink.doc.name.should.equal 'blink'
      @commands.blink.doc.desc.should.contain 'Flashes a light'
      @commands.blink.paramNames.should.deep.equal ['times', 'light', 'ms']

  describe 'twinkle', () =>

    it 'check the metadata', () =>
      @commands.twinkle.doc.name.should.equal 'twinkle'
      @commands.twinkle.doc.desc.should.contain 'Flashes a light'
      @commands.twinkle.paramNames.should.deep.equal ['light', 'ms']

  describe 'cycle', () =>

    it 'check the metadata', () =>
      @commands.cycle.doc.name.should.equal 'cycle'
      @commands.cycle.doc.desc.should.contain 'Blinks each light'
      @commands.cycle.paramNames.should.deep.equal ['times', 'ms']

  describe 'jointly', () =>

    it 'check the metadata', () =>
      @commands.jointly.doc.name.should.equal 'jointly'
      @commands.jointly.doc.desc.should.contain 'Flashes all lights'
      @commands.jointly.paramNames.should.deep.equal ['ms']

  describe 'heartbeat', () =>

    it 'check the metadata', () =>
      @commands.heartbeat.doc.name.should.equal 'heartbeat'
      @commands.heartbeat.doc.desc.should.contain 'Heartbeat pattern'
      @commands.heartbeat.paramNames.should.deep.equal ['light']

  describe 'sos', () =>

    it 'check the metadata', () =>
      @commands.sos.doc.name.should.equal 'sos'
      @commands.sos.doc.desc.should.contain 'SOS distress signal'
      @commands.sos.paramNames.should.deep.equal ['light']

  describe 'danger', () =>

    it 'check the metadata', () =>
      @commands.danger.doc.name.should.equal 'danger'
      @commands.danger.doc.desc.should.contain 'Twinkle red'
      @commands.danger.paramNames.should.deep.equal []

  describe 'bounce', () =>

    it 'check the metadata', () =>
      @commands.bounce.doc.name.should.equal 'bounce'
      @commands.bounce.doc.desc.should.contain 'Bounces through the lights'
      @commands.bounce.paramNames.should.deep.equal ['ms']

  describe 'soundbar', () =>

    it 'check the metadata', () =>
      @commands.soundbar.doc.name.should.equal 'soundbar'
      @commands.soundbar.doc.desc.should.contain 'Just like a sound bar'
      @commands.soundbar.paramNames.should.deep.equal ['ms']
