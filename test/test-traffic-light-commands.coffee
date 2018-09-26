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
    # parser
    @cp = new CommandParser()
    defineCommands(@cp) # load "defined" commands
    @commands = @cp.commands
    @exec = (cmd, tl=@tl, ct=@ct) => @cp.execute(cmd, {tl}, ct, scope)

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

  describe 'pulse', () =>

    it 'check the metadata', () =>
      @commands.pulse.doc.name.should.equal 'pulse'
      @commands.pulse.doc.desc.should.contain 'Single pulse pattern'
      @commands.pulse.paramNames.should.deep.equal ['light']

  describe 'count', () =>

    it 'check the metadata', () =>
      @commands.count.doc.name.should.equal 'count'
      @commands.count.doc.desc.should.contain 'Count a number of times repeatedly'
      @commands.count.paramNames.should.deep.equal ['times', 'light']

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

  describe 'up', () =>

    it 'check the metadata', () =>
      @commands.up.doc.name.should.equal 'up'
      @commands.up.doc.desc.should.contain 'Go up with the given duration'
      @commands.up.paramNames.should.deep.equal ['ms']

  describe 'down', () =>

    it 'check the metadata', () =>
      @commands.down.doc.name.should.equal 'down'
      @commands.down.doc.desc.should.contain 'Go down with the given duration'
      @commands.down.paramNames.should.deep.equal ['ms']

  describe 'bounce', () =>

    it 'check the metadata', () =>
      @commands.bounce.doc.name.should.equal 'bounce'
      @commands.bounce.doc.desc.should.contain 'Bounce with the given duration'
      @commands.bounce.paramNames.should.deep.equal ['ms']

  describe 'soundbar', () =>

    it 'check the metadata', () =>
      @commands.soundbar.doc.name.should.equal 'soundbar'
      @commands.soundbar.doc.desc.should.contain 'Like a sound bar with the given duration'
      @commands.soundbar.paramNames.should.deep.equal ['ms']

  describe 'CommandParser', () =>

    # parse throws when it fails

    it 'parse two commands with no space between them', () =>
      @cp.parse """
        (toggle green)(pause 300) ; no space between commands
      """

    it 'parse two commands used as parameters with no space between them', () =>
      @cp.parse """
        loop
          (toggle green)(pause 300) ; no space between commands
      """

    it 'parse a command name with no space to its parameter-command', () =>
      @cp.parse 'run(toggle green)'
