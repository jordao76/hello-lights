{RED, YELLOW, GREEN, ON, OFF, PhysicalLight, PhysicalTrafficLight} =
  require('../../src/physical-traffic-light')
require('chai').should()
proc = require('child_process')
sinon = require('sinon')

allTestOptions =
  USBswitchCmd: {
    greenOnFirstDevice: '-n 0 -# 2 1'
    greenOnLastDevice: '-n 3 -# 2 1'
    redOff: '-n 0 -# 0 0'
    yellowOn: '-n 0 -# 1 1'
    yellowOff: '-n 0 -# 1 0'
    greenOff: '-n 0 -# 2 0'
    deviceNotFoundOutput: 'USBswitch not found'
    deviceListOutput: [
      "Device 0: Type=8, Version=29, SerNum=900636"
      "Device 1: Type=8, Version=29, SerNum=900637"
      "Device 2: Type=7, Version=34, SerNum=920638"
      "Device 3: Type=8, Version=29, SerNum=900639"
    ]
  }
  ClewareControl: {
    greenOnFirstDevice: '-d 900636 -c 1 -as 2 1'
    greenOnLastDevice: '-d 900639 -c 1 -as 2 1'
    redOff: '-d 900636 -c 1 -as 0 0'
    yellowOn: '-d 900636 -c 1 -as 1 1'
    yellowOff: '-d 900636 -c 1 -as 1 0'
    greenOff: '-d 900636 -c 1 -as 2 0'
    deviceNotFoundOutput: 'Device 900639 not found'
    deviceListOutput: [
      "Cleware library version: 330"
      "Number of Cleware devices found: 4"
      "Device 0: Type=Switch (8), Version=29, Serial Number=900636"
      "Device 1: Type=Switch (8), Version=29, Serial Number=900637"
      "Device 2: Type=Switch (7), Version=34, Serial Number=920638"
      "Device 3: Type=Switch (8), Version=29, Serial Number=900639"
    ]
  }

testClewareDevice = (type) ->
  testOptions = allTestOptions[type]
  options = type: type, path: 'cmd'
  {ClewareDevice} = require("../../src/devices/#{options.type}")(options)

  fakeExec = (deviceListOutput) -> (cmd, cb) ->
    if cmd == 'cmd -l'
      cb(1, deviceListOutput.join '\n')
    else if cmd == "cmd #{testOptions.greenOnFirstDevice}"
      cb(1, '')
    else
      cb(1, testOptions.deviceNotFoundOutput)

  describe options.type, ->

    beforeEach () ->
      @deviceListOutput = testOptions.deviceListOutput
      @exec = sinon.stub(proc, 'exec')
        .callsFake(fakeExec(@deviceListOutput))
      @devices = await ClewareDevice.refreshDevices()
      @device = @devices['900636'] # calls to turn will succeed
      @lastDevice = @devices['900639'] # calls to turn will fail

    afterEach () -> @exec.restore()

    describe 'ClewareDevice', ->

      it 'resolves connected devices', ->
        sinon.assert.calledWith(@exec, 'cmd -l')
        sinon.assert.calledOnce(@exec)
        Object.keys(@devices).should.deep.equal ['900636','900637','900639']
        @device.deviceNum.should.equal '0'
        @device.serialNum.should.equal '900636'
        @device.isConnected.should.be.true

      it 'turns connected device', ->
        await @device.turn(GREEN, ON)
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.greenOnFirstDevice)
        @device.isConnected.should.be.true
        sinon.assert.calledTwice(@exec)

      it 'detects disconnected device when turning', ->
        await @lastDevice.turn(GREEN, ON)
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.greenOnLastDevice)
        @lastDevice.isConnected.should.be.false
        sinon.assert.calledTwice(@exec)

      it 'does NOT turn disconnected device', ->
        @lastDevice.disconnect()
        await @lastDevice.turn(GREEN, ON)
        sinon.assert.calledOnce(@exec) # `cmd -l` only

      it 'detects disconnected device reconnection when refreshing devices', ->
        @lastDevice.disconnect()
        await ClewareDevice.refreshDevices()
        @lastDevice.isConnected.should.be.true
        sinon.assert.calledTwice(@exec)

      it 'marks removed device as disconnected when refreshing', ->
        @deviceListOutput.pop() # remove last
        @lastDevice.isConnected.should.be.true # still connected before refresh
        await ClewareDevice.refreshDevices()
        @lastDevice.isConnected.should.be.false
        sinon.assert.calledTwice(@exec)

    describe 'PhysicalLight', ->

      beforeEach () ->
        @light = new PhysicalLight(YELLOW, @device)

      it 'starts as off', ->
        @light.on.should.be.false
        @light.device.should.equal @device

      it 'toggle calls the executable', ->
        @light.toggle()
        @light.on.should.be.true
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.yellowOn)
        @light.toggle()
        @light.on.should.be.false
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.yellowOff)

      it 'toggle does NOT call the executable for a disconnected device', ->
        @device.disconnect()
        @light.toggle() # no-op on disconnected device
        @light.on.should.be.false
        sinon.assert.calledOnce(@exec) # `cmd -l`

      it 'turns light on and off', ->
        @light.turnOn()
        @light.on.should.be.true
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.yellowOn)
        @light.turnOff()
        @light.on.should.be.false
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.yellowOff)

    describe 'PhysicalTrafficLight', ->

      beforeEach () ->
        @tl = new PhysicalTrafficLight(@device)
        sinon.assert.calledOnce(@exec) # `cmd -l`

      it 'reset turns all lights off', ->
        @tl.red.turnOn()
        @tl.reset();
        @tl.red.on.should.be.false
        # reset turns off all lights even if they are off,
        # since in the physical device they might actually be on,
        # and thus out of synch with the internal representation
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.redOff)
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.yellowOff)
        sinon.assert.calledWith(@exec, 'cmd '+testOptions.greenOff)

testClewareDevice 'USBswitchCmd'
testClewareDevice 'ClewareControl'
