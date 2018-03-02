{Light, TrafficLight} = require '../src/traffic-light'
c = require '../src/commands'
require('chai').should()
sinon = require 'sinon'
nativeSetTimeout = setTimeout
yieldThen = (fn) => nativeSetTimeout(fn, 0)

describe 'Commands', () =>

  beforeEach () => @clock = sinon.useFakeTimers()
  afterEach () => @clock.restore()

  describe 'pause', () =>

    it 'should pause for 500ms', (done) =>
        paused = false
        run = () =>
          await c.pause 500
          paused = true
        run().then () =>
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 500

    it 'should be cancellable', (done) =>
      paused = false
      run = () =>
        await c.pause 5000
        paused = true
      run().then () =>
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
        command = (tl, ct) => c.pause 25000, @token=ct
        await c.timeout @tl, 5000, command
      run().then () =>
        @token.isCancelled.should.be.true
        done()
      @clock.tick 6000

    it 'the timeout itself should be cancellable', (done) =>
      run = () =>
        command = (tl, ct) => c.pause 25000, @token=ct
        await c.timeout @tl, 5000, command
      run().then () =>
        @token.isCancelled.should.be.true
        done()
      c.cancel()

    it 'should NOT cancel when the command ends before the timeout', (done) =>
      run = () =>
        command = (tl, ct) => c.pause 250, @token=ct
        await c.timeout @tl, 5000, command
      run().then () =>
        @token.isCancelled.should.be.false
        done()
      @clock.tick 250
      yieldThen () => @clock.tick 250

  describe 'lights', () =>

    beforeEach () => @tl = new TrafficLight

    it 'should turn lights on and off', () =>
      await c.lights @tl, 1, true, 'on' # different styles
      @tl.red.on.should.be.true
      @tl.yellow.on.should.be.true
      @tl.green.on.should.be.true
      await c.lights @tl, 'off', false, 0
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
      await c.lights @tl, 1, 'false', 0
      @tl.red.on.should.be.true
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
      await c.lights @tl, 0, 0, 0
      await c.lights @tl, 'off', 'true', false
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.true
      @tl.green.on.should.be.false
      await c.lights @tl, 0, 0, 0
      await c.lights @tl, 0, 0, 'on'
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.true

    it 'should NOT turn lights on when already cancelled', () =>
      ct = isCancelled: true
      await c.lights @tl, 1, true, 'on', ct
      @tl.red.on.should.be.false
      @tl.yellow.on.should.be.false
      @tl.green.on.should.be.false
