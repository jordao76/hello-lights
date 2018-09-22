{Light, TrafficLight} = require '../src/traffic-light'
{MultiLight, MultiTrafficLight, FlexMultiTrafficLight} = require '../src/multi-traffic-light'
require('chai').should()

describe 'MultiLight', () ->

  beforeEach () ->
    @l1 = new Light
    @l2 = new Light
    @ml = new MultiLight [@l1, @l2]

  it 'should toggle the lights', () ->
    @ml.toggle()
    @l1.on.should.be.true
    @l2.on.should.be.true
    @ml.on.should.be.true
    @ml.toggle()
    @l1.on.should.be.false
    @l2.on.should.be.false
    @ml.on.should.be.false

  it 'should turn the lights on and off', () ->
    @ml.turnOn()
    @l1.on.should.be.true
    @l2.on.should.be.true
    @ml.on.should.be.true
    @ml.turnOff()
    @l1.on.should.be.false
    @l2.on.should.be.false
    @ml.on.should.be.false

describe 'MultiTrafficLight', () ->

  beforeEach () ->
    @tl1 = new TrafficLight
    @tl2 = new TrafficLight
    @mtl = new MultiTrafficLight [@tl1, @tl2]

  it 'should reset all lights to off', () ->
    @mtl.red.toggle()
    @mtl.yellow.toggle()
    @mtl.green.toggle()

    # sanity checks
    @tl1.red.on.should.be.true
    @tl1.yellow.on.should.be.true
    @tl1.green.on.should.be.true
    @tl2.red.on.should.be.true
    @tl2.yellow.on.should.be.true
    @tl2.green.on.should.be.true

    @mtl.reset()
    @tl1.red.on.should.be.false
    @tl1.yellow.on.should.be.false
    @tl1.green.on.should.be.false
    @tl2.red.on.should.be.false
    @tl2.yellow.on.should.be.false
    @tl2.green.on.should.be.false

describe 'FlexMultiTrafficLight', () ->

  beforeEach () ->
    @tl1 = new TrafficLight
    @tl2 = new TrafficLight
    @mtl = new FlexMultiTrafficLight [@tl1, @tl2]

  it 'starts using the first traffic light', () ->
    @mtl.red.toggle()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.false

  it 'can switch to using the second traffic light', () ->
    @mtl.use [1] # 0-based
    @mtl.red.toggle()
    @tl1.red.on.should.be.false
    @tl2.red.on.should.be.true

  it 'can use both traffic lights', () ->
    @mtl.use [0, 1]
    @mtl.red.toggle()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.true

  it 'use wraps around the indexes', () ->
    @mtl.use [2, 3] # ends up being 0, 1
    @mtl.red.toggle()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.true

  it 'useAll uses both traffic lights', () ->
    @mtl.useAll()
    @mtl.red.toggle()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.true

  it 'next uses the next traffic light', () ->
    @mtl.next()
    @mtl.red.toggle()
    @tl1.red.on.should.be.false
    @tl2.red.on.should.be.true # using the 2nd
    @mtl.next() # wraps around
    @mtl.red.toggle()
    @tl1.red.on.should.be.true # using the 1st
    @tl2.red.on.should.be.true

  it 'next works with multiple selected traffic lights', () ->
    @tl3 = new TrafficLight # add a 3rd
    @tl4 = new TrafficLight # and a 4th
    @mtl = new FlexMultiTrafficLight [@tl1, @tl2, @tl3, @tl4]

    @mtl.use [0, 2]
    @mtl.red.toggle()
    # sanity checks
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.false
    @tl3.red.on.should.be.true
    @tl4.red.on.should.be.false

    @mtl.next() # using 1 and 3
    @mtl.red.toggle()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.true
    @tl3.red.on.should.be.true
    @tl4.red.on.should.be.true

    @mtl.next() # using 2 and 4 (which wraps around to 0)
    @mtl.red.toggle()
    @tl1.red.on.should.be.false
    @tl2.red.on.should.be.true
    @tl3.red.on.should.be.false
    @tl4.red.on.should.be.true

    @mtl.next() # using 3 and 1
    @mtl.red.toggle()
    @tl1.red.on.should.be.false
    @tl2.red.on.should.be.false
    @tl3.red.on.should.be.false
    @tl4.red.on.should.be.false

  it 'reset turns all lights in all traffic lights to off and goes back to using the first traffic light', () ->
    @mtl.useAll()
    @mtl.red.turnOn()
    @tl1.red.on.should.be.true
    @tl2.red.on.should.be.true
    @mtl.reset()
    @tl1.red.on.should.be.false
    @tl2.red.on.should.be.false
    @mtl.red.toggle()
    @tl1.red.on.should.be.true # only using the 1st
    @tl2.red.on.should.be.false
