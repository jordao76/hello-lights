options = type: 'USBswitchCmd', path: 'cmd'
{ USBswitchCmdDevice, USBswitchCmdLight, USBswitchCmdTrafficLight } =
  require('../../src/devices/USBswitchCmd')(options)
require('chai').should()
proc = require('child_process')
sinon = require('sinon')

fakeExec = (deviceListOutput) -> (cmd, cb) ->
  if cmd == 'cmd -l'
    cb(1, deviceListOutput.join '\n')
  else if cmd == 'cmd -n 0 -# 2 1' # device 0 green on
    cb(1, '')
  else
    cb(1, 'USBswitch not found')

describe 'USBswitchCmd', ->

  beforeEach () ->
    @deviceListOutput = [
      "Device 0: Type=8, Version=29, SerNum=900636",
      "Device 1: Type=8, Version=29, SerNum=900637",
      "Device 2: Type=7, Version=34, SerNum=920638",
      "Device 3: Type=8, Version=29, SerNum=900639"
    ]
    @exec = sinon.stub(proc, 'exec')
      .callsFake(fakeExec(@deviceListOutput))
    @devices = await USBswitchCmdDevice.resolveDevices()
    @device = @devices['900636'] # calls to turn will success
    @lastDevice = @devices['900639'] # calls to turn will fail

  afterEach () -> @exec.restore()

  describe 'USBswitchCmdDevice', ->

    it 'resolves connected devices', ->
      sinon.assert.calledWith(@exec, 'cmd -l')
      sinon.assert.calledOnce(@exec)
      Object.keys(@devices).should.deep.equal ['900636','900637','900639']
      @device.deviceNum.should.equal '0'
      @device.serialNum.should.equal '900636'
      @device.isConnected.should.be.true

    it 'turns connected device', ->
      await @device.turn(2, 1) # green (2) on (1)
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 2 1')
      @device.isConnected.should.be.true
      sinon.assert.calledTwice(@exec)

    it 'detects disconnected device when turning', ->
      await @lastDevice.turn(2, 1) # green (2) on (1)
      sinon.assert.calledWith(@exec, 'cmd -n 3 -# 2 1')
      @lastDevice.isConnected.should.be.false
      sinon.assert.calledTwice(@exec)

    it 'does NOT turn disconnected device', ->
      @lastDevice.disconnect()
      await @lastDevice.turn(2, 1) # green (2) on (1)
      sinon.assert.calledOnce(@exec) # `cmd -l`, but not `cmd -n 3 -# 2 1`

    it 'detects disconnected device reconnection when resolving devices', ->
      @lastDevice.disconnect()
      await USBswitchCmdDevice.resolveDevices()
      @lastDevice.isConnected.should.be.true
      sinon.assert.calledTwice(@exec)

  describe 'USBswitchCmdLight', ->

    beforeEach () ->
      @light = new USBswitchCmdLight(1, @device) # yellow (1)

    it 'starts as off', ->
      @light.on.should.be.false
      @light.device.should.equal @device

    it 'toggle calls the executable', ->
      @light.toggle()
      @light.on.should.be.true
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 1 1')
      @light.toggle()
      @light.on.should.be.false
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 1 0')

    it 'toggle does NOT call the executable for a disconnected device', ->
      @device.disconnect()
      @light.toggle() # no-op on disconnected device
      @light.on.should.be.false
      sinon.assert.calledOnce(@exec) # `cmd -l`

    it 'turns light on and off', ->
      @light.turnOn()
      @light.on.should.be.true
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 1 1')
      @light.turnOff()
      @light.on.should.be.false
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 1 0')

  describe 'USBswitchCmdTrafficLight', ->

    beforeEach () ->
      @tl = new USBswitchCmdTrafficLight(@device)
      sinon.assert.calledOnce(@exec) # `cmd -l`

    it 'reset turns all on lights off', ->
      @tl.red.turnOn()
      @tl.reset();
      @tl.red.on.should.be.false
      # reset turns off all lights even if they are off,
      # since in the physical device they might actually be on,
      # and thus out of synch with the internal representation
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 0 0')
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 1 0')
      sinon.assert.calledWith(@exec, 'cmd -n 0 -# 2 0')
