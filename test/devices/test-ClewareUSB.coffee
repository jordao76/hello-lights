{RED, YELLOW, GREEN, ON, OFF, PhysicalLight, PhysicalTrafficLight} =
  require('../../src/physical-traffic-light')
require('chai').should()
HID = require('node-hid')
sinon = require('sinon')

{ClewareUSBDevice} = require("../../src/devices/ClewareUSB")({})

describe 'ClewareUSBDevice', ->

  beforeEach () ->
    @deviceList = [
      {path: '1', serialNumber: '900636'}
      {path: '2', serialNumber: '900637'}
      {path: '4', serialNumber: '900639'}
    ]
    @HID_devices = sinon.stub(HID, 'devices').returns @deviceList
    @HID_HID_write = sinon.stub()
    @HID_HID = sinon.stub(HID, 'HID').returns write: @HID_HID_write
    @devices = await ClewareUSBDevice.refreshDevices()
    @device = @devices['900636']
    @lastDevice = @devices['900639']

  afterEach () ->
    @HID_devices.restore()
    @HID_HID.restore()

  describe 'Device', ->

    it 'resolves connected devices', ->
      VENDOR_ID = 3408
      SWITCH1_DEVICE = 8
      sinon.assert.calledWith(@HID_devices, VENDOR_ID, SWITCH1_DEVICE)
      sinon.assert.calledOnce(@HID_devices)
      Object.keys(@devices).should.deep.equal ['900636','900637','900639']
      @device.serialNum.should.equal '900636'
      @device.isConnected.should.be.true

    it 'turns connected device', ->
      await @device.turn(GREEN, ON)
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + GREEN, ON])
      @device.isConnected.should.be.true

    it 'detects disconnected device when turning', ->
      @HID_HID_write.throws()
      await @device.turn(GREEN, ON)
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + GREEN, ON])
      @device.isConnected.should.be.false

    it 'does NOT turn disconnected device', ->
      @HID_HID_write.throws()
      @device.disconnect()
      await @device.turn(GREEN, ON)

    it 'detects disconnected device reconnection when refreshing devices', ->
      @device.disconnect()
      await ClewareUSBDevice.refreshDevices()
      @device.isConnected.should.be.true

    it 'marks removed device as disconnected when refreshing', ->
      @deviceList.pop() # remove last
      @lastDevice.isConnected.should.be.true # still connected before refresh
      await ClewareUSBDevice.refreshDevices()
      @lastDevice.isConnected.should.be.false

  describe 'PhysicalLight', ->

    beforeEach () ->
      @light = new PhysicalLight(YELLOW, @device)

    it 'starts as off', ->
      @light.on.should.be.false
      @light.device.should.equal @device

    it 'toggle calls write', ->
      @light.toggle()
      @light.on.should.be.true
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + YELLOW, ON])
      @light.toggle()
      @light.on.should.be.false
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + YELLOW, OFF])

    it 'toggle does NOT call write for a disconnected device', ->
      @device.disconnect()
      @light.toggle() # no-op on disconnected device
      @light.on.should.be.false

    it 'turns light on and off', ->
      @light.turnOn()
      @light.on.should.be.true
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + YELLOW, ON])
      @light.turnOff()
      @light.on.should.be.false
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + YELLOW, OFF])

  describe 'PhysicalTrafficLight', ->

    beforeEach () ->
      @tl = new PhysicalTrafficLight(@device)

    it 'reset turns all lights off', ->
      @tl.red.turnOn()
      @tl.reset();
      @tl.red.on.should.be.false
      # reset turns off all lights even if they are off,
      # since in the physical device they might actually be on,
      # and thus out of synch with the internal representation
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + RED, OFF])
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + YELLOW, OFF])
      sinon.assert.calledWith(@HID_HID_write, [0, 0, 0x10 + GREEN, OFF])
