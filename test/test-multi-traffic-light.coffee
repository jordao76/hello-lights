require './setup-unhandled-rejection'
{Light, TrafficLight} = require '../src/traffic-light'
{MultiLight, MultiTrafficLight, FlexMultiTrafficLight} = require '../src/multi-traffic-light'
sinon = require('sinon')
require('chai').should()

TrafficLight::setEnabled = (v) ->
  Object.defineProperty @, 'isEnabled', { value: v, configurable: true }
  @emit if v then 'enabled' else 'disabled'

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
    @tl0 = new TrafficLight
    @tl1 = new TrafficLight
    @mtl = new MultiTrafficLight [@tl0, @tl1]

  it 'should be enabled as long as one composed traffic light is enabled', () ->
    @mtl.isEnabled.should.be.true
    @tl0.setEnabled false
    @tl0.isEnabled.should.be.false
    @mtl.isEnabled.should.be.true
    @tl1.setEnabled false
    @mtl.isEnabled.should.be.false
    @tl0.setEnabled true
    @mtl.isEnabled.should.be.true

  it 'should reset all lights to off', () ->
    @mtl.red.toggle()
    @mtl.yellow.toggle()
    @mtl.green.toggle()

    # sanity checks
    @tl0.red.on.should.be.true
    @tl0.yellow.on.should.be.true
    @tl0.green.on.should.be.true
    @tl1.red.on.should.be.true
    @tl1.yellow.on.should.be.true
    @tl1.green.on.should.be.true

    @mtl.reset()
    @tl0.red.on.should.be.false
    @tl0.yellow.on.should.be.false
    @tl0.green.on.should.be.false
    @tl1.red.on.should.be.false
    @tl1.yellow.on.should.be.false
    @tl1.green.on.should.be.false

describe 'FlexMultiTrafficLight', () ->

  beforeEach () ->
    @tl0 = new TrafficLight
    @tl1 = new TrafficLight
    @tl2 = new TrafficLight
    @tl3 = new TrafficLight
    @mtl = new FlexMultiTrafficLight [@tl0, @tl1, @tl2, @tl3]

  describe 'use', () ->

    it 'starts using the first traffic light', () ->
      @mtl.using().should.deep.equal [0]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.false

    it 'can switch to using the second traffic light', () ->
      @mtl.use [1] # 0-based
      @mtl.using().should.deep.equal [1]
      @mtl.red.toggle()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.true

    it 'can use the first and the second traffic lights', () ->
      @mtl.use [0, 1]
      @mtl.using().should.deep.equal [0, 1]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.false

    it 'use wraps around the indexes', () ->
      @mtl.use [4, 5, 8] # ends up being 0, 1, 0; duplicates are ignored
      @mtl.using().should.deep.equal [0, 1]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.false

  describe 'useAll', () ->

    it 'useAll uses all traffic lights', () ->
      @mtl.useAll()
      @mtl.using().should.deep.equal [0, 1, 2, 3]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.true
      @tl3.red.on.should.be.true

  describe 'next', () ->

    it 'next uses the next traffic light', () ->
      @mtl.next() # using the 2nd
      @mtl.using().should.deep.equal [1]
      @mtl.red.toggle()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.true
      @mtl.next() # using the 3rd
      @mtl.using().should.deep.equal [2]
      @mtl.red.toggle()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.true
      @tl3.red.on.should.be.false

    it 'next wraps around the last traffic light', () ->
      @mtl.use [3] # using the last
      @mtl.using().should.deep.equal [3]
      @mtl.red.toggle()
      @tl3.red.on.should.be.true
      @mtl.next() # using the 1st (wraps around)
      @mtl.using().should.deep.equal [0]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.false
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.true

    it 'next works with multiple selected traffic lights', () ->
      @mtl.use [0, 2]
      @mtl.using().should.deep.equal [0, 2]
      @mtl.red.toggle()
      # sanity checks
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.false
      @tl2.red.on.should.be.true
      @tl3.red.on.should.be.false

      @mtl.next() # using 1 and 3
      @mtl.using().should.deep.equal [1, 3]
      @mtl.red.toggle()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.true
      @tl3.red.on.should.be.true

      @mtl.next() # using 2 and 4 (which wraps around to 0)
      @mtl.using().should.deep.equal [0, 2]
      @mtl.red.toggle()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.true

      @mtl.next() # using 3 and 1
      @mtl.using().should.deep.equal [1, 3]
      @mtl.red.toggle()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.false
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.false

  describe 'reset', () ->

    it 'reset turns the active traffic light off', () ->
      @mtl.red.turnOn()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.false
      @mtl.use [1]
      @mtl.red.turnOn()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @mtl.reset()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.false # turns active traffic light off

    it 'reset turns all active traffic lights off', () ->
      @mtl.useAll()
      @mtl.red.turnOn()
      @tl0.red.on.should.be.true
      @tl1.red.on.should.be.true
      @tl2.red.on.should.be.true
      @tl3.red.on.should.be.true
      @mtl.reset()
      @tl0.red.on.should.be.false
      @tl1.red.on.should.be.false
      @tl2.red.on.should.be.false
      @tl3.red.on.should.be.false

  describe 'disabling and enabling traffic lights', () ->

    # Notation for tracking a traffic light state:
    #   x[i] where
    #     x = '*' for active, <empty> otherwise
    #     i = current index or <empty> if disabled
    #   e.g.
    #     @t0 @tl1 @tl2 @tl3
    #     [0] *[1]  []  [2] <--- 2nd active, 3rd disabled

    beforeEach () ->
      @enabled = sinon.stub()
      @disabled = sinon.stub()
      @interrupted = sinon.stub()
      @mtl.on 'enabled', @enabled
      @mtl.on 'disabled', @disabled
      @mtl.on 'interrupted', @interrupted
      #  @t0 @tl1 @tl2 @tl3
      # *[0] [1]  [2]  [3] <--- initial state: all enabled, 1st active

    describe 'should skip over disabled traffic lights', () ->

      beforeEach () ->
                              # *[0] [1] [2] [3]
        @tl1.setEnabled false # *[0] []  [1] [2] <--- 1st active, 2nd disabled

      it 'next skips over disabled traffic light', () ->
        @mtl.red.toggle()
        @tl0.red.on.should.be.true
                    # *[0] []  [1] [2]
        @mtl.next() #  [0] [] *[1] [2]
        @mtl.using().should.deep.equal [1]
        @mtl.red.toggle()
        @tl0.red.on.should.be.true
        @tl1.red.on.should.be.false
        @tl2.red.on.should.be.true

      it 'use ignores disabled traffic light', () ->
                           # *[0] []  [1]  [2]
        @mtl.use [0, 1, 2] # *[0] [] *[1] *[2]
        @mtl.using().should.deep.equal [0, 1, 2]
        @mtl.red.toggle()
        @tl0.red.on.should.be.true  # 0
        @tl1.red.on.should.be.false # (ignored)
        @tl2.red.on.should.be.true  # 1
        @tl3.red.on.should.be.true  # 2
        @mtl.use [3, 4, 5] # *[0] [] *[1] *[2] <--- same thing as the first case, but wrapping at the end
        @mtl.using().should.deep.equal [0, 1, 2]
        @mtl.green.toggle()
        @tl0.green.on.should.be.true  # 0
        @tl1.green.on.should.be.false # (disabled)
        @tl2.green.on.should.be.true  # 1
        @tl3.green.on.should.be.true  # 2

      it 'useAll ignores disabled traffic light', () ->
        @mtl.useAll() # *[0] [] *[1] *[2]
        @mtl.using().should.deep.equal [0, 1, 2]
        @mtl.red.toggle()
        @tl0.red.on.should.be.true
        @tl1.red.on.should.be.false # (ignored)
        @tl2.red.on.should.be.true
        @tl3.red.on.should.be.true

    describe 'when an inactive traffic light is disabled', () ->

      it 'does not emit the interrupted event', () ->
        @mtl.use [1, 2]         # [0] *[1] *[2] [3]
        @tl3.setEnabled false   # [0] *[1] *[2] []
        @interrupted.callCount.should.equal 0
        @tl0.setEnabled false # not active
        @interrupted.callCount.should.equal 0

      it 'recalculates used indexes accordingly', () ->
        @mtl.use [1, 2]                         # [0] *[1] *[2] [3]
        @tl3.setEnabled false                   # [0] *[1] *[2] []
        @mtl.using().should.deep.equal [1, 2]
        @tl0.setEnabled false                   # []  *[0] *[1] []
        @mtl.using().should.deep.equal [0, 1]
        @tl0.setEnabled true                    # [0] *[1] *[2] []
        @mtl.using().should.deep.equal [1, 2]

    describe 'when the active traffic light is disabled', () ->

      it 'when there are still enabled traffic lights, emits the interrupted event', () ->
        @mtl.using().should.deep.equal [0]      # *[0] [1] [2] [3]
        @interrupted.callCount.should.equal 0
        @tl0.setEnabled false                   #  [] *[0] [1] [2]
        @interrupted.callCount.should.equal 1
        @mtl.using().should.deep.equal [0]

      it 'recalculates the used index accordingly', () ->
        @mtl.use [2]            #  [0] [1] *[2] [3]
        @tl2.setEnabled false   # *[0] [1]  []  [2]
        @mtl.using().should.deep.equal [0]

      it 'when using multiple, recalculates used indexes accordingly', () ->
        @mtl.use [0, 2, 3]      # *[0] [1] *[2] *[3]
        @tl2.setEnabled false   # *[0] [1]  []  *[2]
        @mtl.using().should.deep.equal [0, 2]
        @tl0.setEnabled false   #  []  [0]  []  *[1]
        @mtl.using().should.deep.equal [1]

      it 'when using multiple, emits the interrupted event for all', () ->
        @mtl.use [1, 2, 3]      # [0] *[1] *[2] *[3]
        @tl1.setEnabled false   # [0]  []  *[1] *[2]
        @interrupted.callCount.should.equal 1
        @mtl.using().should.deep.equal [1, 2]
        @tl0.setEnabled false   # []   []  *[0] *[1]
        @interrupted.callCount.should.equal 1 # did not interrupt
        @mtl.using().should.deep.equal [0, 1]
        @tl2.setEnabled false   # []   []   []  *[0]
        @interrupted.callCount.should.equal 2
        @mtl.using().should.deep.equal [0]

      describe 'when all traffic lights are disabled', () ->

        beforeEach () ->
          @mtl.using().should.deep.equal [0] # *[0] [1] [2] [3]
          @tl0.setEnabled false              #  [] *[0] [1] [2]
          @mtl.using().should.deep.equal [0]
          @tl1.setEnabled false              #  []  [] *[0] [1]
          @tl2.setEnabled false              #  []  []  [] *[0]
          @disabled.callCount.should.equal 0
          @tl3.setEnabled false              #  []  []  []  []
          @mtl.using().should.deep.equal []  # nothing left to use

        it 'does not emit interrupted for the last disabled one', () ->
          @interrupted.callCount.should.equal 3 # not 4

        it 'emits the disabled event', () ->
          @disabled.callCount.should.equal 1

        it 'emits the enabled event when the first traffic light is enabled', () ->
          @enabled.callCount.should.equal 0 #   []  []  []  []
          @tl0.setEnabled true              # *[0]  []  []  []
          @mtl.using().should.deep.equal [0]
          @enabled.callCount.should.equal 1
          @tl1.setEnabled true              # *[0] [1]  []  []
          @enabled.callCount.should.equal 1 # no difference since it's already enabled

  describe 'add', () ->

    beforeEach () ->
      @interrupted = sinon.stub()
      @mtl.on 'interrupted', @interrupted
      @tl4 = new TrafficLight
      @mtl.add @tl4

    it 'can use the added traffic light', () ->
      @mtl.use [4]
      @mtl.using().should.deep.equal [4]
      @mtl.red.toggle()
      @tl4.red.on.should.be.true

    it 'raises interrupted for the added traffic light', () ->
      @mtl.use [4]
      @interrupted.callCount.should.equal 0
      @tl4.setEnabled false
      @interrupted.callCount.should.equal 1

    it 'does not add duplicate traffic light', () ->
      @mtl.add @tl4 # add a second time
      @mtl.use [5] # wraps at the end and chooses the first (index 0)
      @mtl.using().should.deep.equal [0]
