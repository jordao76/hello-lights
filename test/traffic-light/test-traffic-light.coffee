require '../setup-unhandled-rejection'
{Light, TrafficLight} = require '../../src/traffic-light/traffic-light'
require('chai').should()

describe 'Light', () ->

  it 'should start as off', () ->
    light = new Light
    light.on.should.be.false
    light.off.should.be.true

  it 'should toggle', () ->
    light = new Light
    light.toggle()
    light.on.should.be.true
    light.off.should.be.false
    light.toggle()
    light.on.should.be.false
    light.off.should.be.true

  it 'should turn on and off', () ->
    light = new Light
    light.turnOn()
    light.on.should.be.true
    light.off.should.be.false
    light.turnOff()
    light.on.should.be.false
    light.off.should.be.true

describe 'TrafficLight', () ->

  it 'should by default start with all lights off', () ->
    tl = new TrafficLight
    tl.red.on.should.be.false
    tl.yellow.on.should.be.false
    tl.green.on.should.be.false

  it 'should reset all lights to off', () ->
    tl = new TrafficLight
    tl.red.toggle()
    tl.yellow.toggle()
    tl.green.toggle()

    # sanity checks
    tl.red.on.should.be.true
    tl.yellow.on.should.be.true
    tl.green.on.should.be.true

    await tl.reset()
    tl.red.on.should.be.false
    tl.yellow.on.should.be.false
    tl.green.on.should.be.false

  describe 'check-out, check-in', ->

    beforeEach () ->
      @tl = new TrafficLight

    it 'should check out a traffic light', () ->
      @tl.isCheckedOut.should.be.false
      checkedOut = @tl.checkOut()
      checkedOut.should.be.true
      @tl.isCheckedOut.should.be.true

    it 'should not check out a traffic light already checked out', () ->
      @tl.checkOut()
      @tl.isCheckedOut.should.be.true
      checkedOut = @tl.checkOut()
      checkedOut.should.be.false
      @tl.isCheckedOut.should.be.true

    it 'should check in traffic light', () ->
      @tl.checkOut()
      @tl.isCheckedOut.should.be.true
      @tl.checkIn()
      @tl.isCheckedOut.should.be.false
