require '../setup-unhandled-rejection'
{Device, DeviceManager} = require '../../src/physical/device'
{PhysicalTrafficLightSelector} = require '../../src/selectors/physical-traffic-light-selector'
should = require('chai').should()
sinon = require('sinon')

describe 'PhysicalTrafficLightSelector', ->

  beforeEach () ->
    @device1 = new Device('device1')
    @device1.turn = sinon.fake()
    @device2 = new Device('device2')
    @device2.turn = sinon.fake()

    @manager = new DeviceManager('unit-test')
    @manager.allDevices = sinon.stub().returns [@device1, @device2]
    @manager.startMonitoring = sinon.spy()
    @manager.stopMonitoring = sinon.spy()

    @enabledCallback = sinon.spy()
    @disabledCallback = sinon.spy()

  it 'should call manager.startMonitoring on construction', () ->
    sinon.assert.callCount @manager.startMonitoring, 0
    new PhysicalTrafficLightSelector {@manager}
    sinon.assert.callCount @manager.startMonitoring, 1

  it 'should call manager.stopMonitoring on close', () ->
    selector = new PhysicalTrafficLightSelector {@manager}
    sinon.assert.callCount @manager.stopMonitoring, 0
    selector.close()
    sinon.assert.callCount @manager.stopMonitoring, 1

  describe 'no specific traffic light requested', () ->

    beforeEach () ->
      @selector = new PhysicalTrafficLightSelector {@manager}
      @selector.on('enabled', @enabledCallback)
      @selector.on('disabled', @disabledCallback)

    it '"resolveTrafficLight" should check out and return the first traffic light', () ->
      tl = @selector.resolveTrafficLight()
      tl.device.should.equal @device1
      tl.isCheckedOut.should.equal true

    it '"resolveTrafficLight" should keep resolving to the checked out traffic light', () ->
      @selector.resolveTrafficLight()
      tl = @selector.resolveTrafficLight()
      tl.device.should.equal @device1

    it 'should raise the enabled event when the manager detects a new device', () ->
      sinon.assert.callCount @enabledCallback, 0
      @manager.emit('added')
      sinon.assert.callCount @enabledCallback, 1

    it 'should not raise the enabled event when there\'s already a checked-out traffic light', () ->
      @selector.resolveTrafficLight() # checks out @device1
      sinon.assert.callCount @enabledCallback, 0
      @manager.emit('added') # doesn't matter
      sinon.assert.callCount @enabledCallback, 0

    it 'should raise the enabled event when the checked-out traffic light got disconnected', () ->
      @selector.resolveTrafficLight() # checks out @device1
      @device1.disconnect()
      sinon.assert.callCount @enabledCallback, 0
      @manager.emit('added') # matters
      sinon.assert.callCount @enabledCallback, 1

    it 'should raise the disabled event when the resolved traffic light is disconnected', () ->
      @selector.resolveTrafficLight()
      sinon.assert.callCount @disabledCallback, 0
      @device1.disconnect()
      sinon.assert.callCount @disabledCallback, 1

    it 'should not raise the disabled event when the non-resolved traffic light is disconnected', () ->
      @selector.resolveTrafficLight()
      sinon.assert.callCount @disabledCallback, 0
      @device2.disconnect()
      sinon.assert.callCount @disabledCallback, 0

    it 'should not raise the disabled event when a known but not the currently resolved traffic light is disconnected', () ->
      @selector.resolveTrafficLight() # device1
      @device1.disconnect()
      @selector.resolveTrafficLight() # device2
      @device2.disconnect()
      sinon.assert.callCount @disabledCallback, 2
      @device1.connect()
      @device2.connect()
      @selector.resolveTrafficLight() # device1 again
      @device2.disconnect()
      sinon.assert.callCount @disabledCallback, 2 # device2 is known but not the currently resolved one

    it 'should resolve to the second device when the first is disconnected', () ->
      @device1.disconnect()
      tl = @selector.resolveTrafficLight()
      tl.device.should.equal @device2
      tl.isCheckedOut.should.equal true

    it 'should return *null* when all traffic lights are disconnected', () ->
      @device1.disconnect()
      @device2.disconnect()
      tl = @selector.resolveTrafficLight()
      should.not.exist tl

  describe 'request the second traffic light', () ->

    beforeEach () ->
      @selector = new PhysicalTrafficLightSelector {@manager, serialNum: 'device2'}

    it '"resolveTrafficLight" should check out and return the second traffic light', () ->
      tl = @selector.resolveTrafficLight()
      tl.device.should.equal @device2
      tl.isCheckedOut.should.equal true

    it 'if the second traffic light is disconnected, return *null*', () ->
      @device2.disconnect()
      tl = @selector.resolveTrafficLight()
      should.not.exist tl
