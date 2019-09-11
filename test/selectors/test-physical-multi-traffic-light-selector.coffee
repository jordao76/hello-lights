require '../setup-unhandled-rejection'
{Device, DeviceManager} = require '../../src/physical/device'
{PhysicalMultiTrafficLightSelector} = require '../../src/selectors/physical-multi-traffic-light-selector'
should = require('chai').should()
sinon = require('sinon')

describe 'PhysicalMultiTrafficLightSelector', ->

  beforeEach () ->
    @device1 = new Device('device1')
    @device1.turn = sinon.fake()
    @device2 = new Device('device2')
    @device2.turn = sinon.fake()

    @manager = new DeviceManager('unit-test')
    @manager.allDevices = sinon.stub().returns [@device1, @device2]
    @manager.startMonitoring = sinon.spy()
    @manager.stopMonitoring = sinon.spy()

  it 'should call manager.startMonitoring on construction', () ->
    sinon.assert.callCount @manager.startMonitoring, 0
    new PhysicalMultiTrafficLightSelector {@manager}
    sinon.assert.callCount @manager.startMonitoring, 1

  it 'should call manager.stopMonitoring on close', () ->
    selector = new PhysicalMultiTrafficLightSelector {@manager}
    sinon.assert.callCount @manager.stopMonitoring, 0
    selector.close()
    sinon.assert.callCount @manager.stopMonitoring, 1

  describe 'selects multiple traffic lights', () ->

    beforeEach () ->

      @enabledCallback = sinon.spy()
      @disabledCallback = sinon.spy()
      @interruptedCallback = sinon.spy()

      @selector = new PhysicalMultiTrafficLightSelector {@manager}
      @selector.on('enabled', @enabledCallback)
      @selector.on('disabled', @disabledCallback)
      @selector.on('interrupted', @interruptedCallback)

    it '"resolveTrafficLight" should check out and return all traffic lights', () ->
      multi = @selector.resolveTrafficLight()
      tls = multi.allTrafficLights
      tls.map((tl) -> tl.device).should.deep.equal [@device1, @device2]
      tls.every((tl) -> tl.isCheckedOut).should.equal true

    it '"resolveTrafficLight" should keep resolving to the checked out traffic lights', () ->
      @selector.resolveTrafficLight()
      multi = @selector.resolveTrafficLight()
      tls = multi.allTrafficLights
      tls.map((tl) -> tl.device).should.deep.equal [@device1, @device2]
      tls.every((tl) -> tl.isCheckedOut).should.equal true

    it 'should automatically fetch a new traffic light that the manager detects', () ->
      multi = @selector.resolveTrafficLight()
      device3 = new Device('device3')
      device3.turn = sinon.fake()
      @manager.allDevices = sinon.stub().returns [@device1, @device2, device3]
      @manager.emit('added')
      tls = multi.allTrafficLights
      tls.map((tl) -> tl.device).should.deep.equal [@device1, @device2, device3]
      tls.every((tl) -> tl.isCheckedOut).should.equal true

    it 'should resolve a new traffic even when the manager does not support monitoring', () ->
      @manager.supportsMonitoring = sinon.stub().returns false
      @selector.resolveTrafficLight()
      device3 = new Device('device3')
      device3.turn = sinon.fake()
      @manager.allDevices = sinon.stub().returns [@device1, @device2, device3]
      multi = @selector.resolveTrafficLight()
      tls = multi.allTrafficLights
      tls.map((tl) -> tl.device).should.deep.equal [@device1, @device2, device3]
      tls.every((tl) -> tl.isCheckedOut).should.equal true

    it 'should raise the interrupted event when an active traffic light gets disabled and there\'s still an enabled traffic light', () ->
      sinon.assert.callCount @interruptedCallback, 0
      @device1.disconnect() # disable the first (active) device
      sinon.assert.callCount @interruptedCallback, 1

    it 'should NOT raise the interrupted event when an inactive traffic light gets disabled', () ->
      sinon.assert.callCount @interruptedCallback, 0
      @device2.disconnect() # disable the second (inactive) device
      sinon.assert.callCount @interruptedCallback, 0

    it 'should NOT raise the disabled event when a traffic light gets disabled and there\'s still an enabled traffic light', () ->
      sinon.assert.callCount @disabledCallback, 0
      @device1.disconnect()
      sinon.assert.callCount @disabledCallback, 0

    it 'should raise the disabled event when all traffic lights get disabled', () ->
      sinon.assert.callCount @disabledCallback, 0
      @device1.disconnect()
      @device2.disconnect()
      sinon.assert.callCount @disabledCallback, 1

    it 'should raise the enabled event when a traffic lights gets enabled after they\'re all disabled', () ->
      @device1.disconnect()
      @device2.disconnect()
      sinon.assert.callCount @enabledCallback, 0
      @device1.connect()
      sinon.assert.callCount @enabledCallback, 1

    it 'should NOT raise the enabled event when a traffic lights gets enabled and the other light is already enabled', () ->
      @device1.disconnect()
      @device2.disconnect()
      @device1.connect()
      sinon.assert.callCount @enabledCallback, 1
      @device1.connect()
      sinon.assert.callCount @enabledCallback, 1 # still 1

    it 'should return *null* when all traffic lights are disconnected', () ->
      @device1.disconnect()
      @device2.disconnect()
      tl = @selector.resolveTrafficLight()
      should.not.exist tl
