c = require '../src/commands'
require('chai').should()
sinon = require 'sinon'
nativeSetTimeout = setTimeout
yieldThen = (fn) -> nativeSetTimeout(fn, 0)

class Light
  constructor: () -> @on = false
  toggle: () -> @on = !@on

describe 'Commands', () ->

  beforeEach () -> @clock = sinon.useFakeTimers()
  afterEach () -> @clock.restore()

  describe 'pause', () ->

    it 'should pause for 500ms', (done) ->
        paused = false
        run = () ->
          await c.pause 500
          paused = true
        run().then () ->
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 500

    it 'should be cancellable', (done) ->
      paused = false
      run = () ->
        await c.pause 5000
        paused = true
      run().then () ->
        paused.should.be.true
        done()
      paused.should.be.false
      @clock.tick 4000
      c.cancel()

  describe 'flash', () ->

    it 'should flash for 500ms', (done) ->
      light = new Light
      run = () ->
        await c.flash light, 250
      run().then () ->
        light.on.should.be.false
        done()
      light.on.should.be.true
      @clock.tick 250
      yieldThen () =>
        light.on.should.be.false
        @clock.tick 250

    it 'should be cancellable', (done) ->
      light = new Light
      run = () ->
        await c.flash light, 250
      run().then () ->
        light.on.should.be.false
        done()
      light.on.should.be.true
      @clock.tick 100
      c.cancel()

  describe 'blink', () ->

    it 'should flash twice', (done) ->
      light = new Light
      run = () ->
        await c.blink light, 250, 2
      run().then () ->
        light.on.should.be.false
        done()
      light.on.should.be.true
      @clock.tick 250
      yieldThen () =>
        light.on.should.be.false
        @clock.tick 250
        yieldThen () =>
          light.on.should.be.true
          @clock.tick 250
          yieldThen () =>
            light.on.should.be.false
            @clock.tick 250

  describe 'timeout', () ->

    it 'should cancel when the timeout is reached', (done) ->
      light = new Light
      token = null
      run = () ->
        command = (ct) ->
          c.twinkle light, 250, token=ct # blink forever
        await c.timeout command, 5000
      run().then () ->
        token.isCancelled.should.be.true
        done()
      @clock.tick 6000

    it 'the timeout itself should be cancellable', (done) ->
      light = new Light
      token = null
      run = () ->
        command = (ct) ->
          c.twinkle light, 250, token=ct # blink forever
        await c.timeout command, 5000
      run().then () ->
        token.isCancelled.should.be.true
        done()
      c.cancel()

    it 'should NOT cancel when the command ends before the timeout', (done) ->
      light = new Light
      token = null
      run = () ->
        command = (ct) -> c.flash light, 250, token=ct
        await c.timeout command, 5000
      run().then () ->
        token.isCancelled.should.be.false
        done()
      @clock.tick 250
      yieldThen () => @clock.tick 250
