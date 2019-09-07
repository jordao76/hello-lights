require './setup-unhandled-rejection'
{Commander} = require '../src/commander'
{Device, DeviceManager} = require '../src/physical/device'
path = require 'path'
require('chai').should()
sinon = require('sinon')
spin = (ms = 0) -> new Promise (resolve) -> setTimeout(resolve, ms)

DEBUG_STUB = (stub) ->
  console.log 'STUB callCount', stub.callCount
  console.log stub.getCall(i).args for i in [0...stub.callCount]

describe 'Commander', () =>

  beforeEach () =>
    @interpreter =
      execute: sinon.stub().returns new Promise (resolve, reject) =>
        @resolve = resolve
        @reject = reject
      cancel: sinon.stub()
    @manager = new DeviceManager 'stub'
    @manager.allDevices = sinon.stub().returns []
    @logger =
      log: sinon.stub()
      error: sinon.stub()
    @cm = new Commander {@interpreter, @manager, @logger}

  describe 'connected device', () =>

    beforeEach () =>
      @device = new Device('999999', true)
      @device.turn = sinon.stub() # abstract in Device
      @manager.allDevices.returns [@device]

    describe 'traffic lights info', () =>

      it 'logInfo', () =>
        @cm.logInfo()
        @logger.log.calledWith('device 999999: connected').should.be.true

    describe 'runDefinitionsFile', () =>

      it 'run command definitions in a file', () =>
        @cm.runDefinitionsFile path.join(__dirname, '/test-commander-fast-command.cljs') # doesn't have to contain only 'define' or 'def'
        @resolve()
        await spin 5
        @interpreter.execute.callCount.should.equal 1

      it 'error reading file', () =>
        @cm.runDefinitionsFile 'dummy-file.txt' # file doesn't exist
        await spin 5
        @interpreter.execute.callCount.should.equal 0
        @logger.error.calledWith("error accessing file 'dummy-file.txt'").should.be.true

    describe 'runDefinitions', () =>

      it 'runDefinitions success', () =>
        @cm.runDefinitions('fast command') # doesn't have to contain only 'define' or 'def'
        @resolve()
        await spin()
        @interpreter.execute.calledOnceWith('fast command').should.be.true # no context to the interpreter
        @logger.log.calledWith('running definitions').should.be.true
        @logger.log.calledWith('finished definitions').should.be.true

      it 'runDefinitions error', () =>
        @cm.runDefinitions('dummy')
        @reject new Error 'dump'
        await spin()
        @interpreter.execute.calledOnceWith('dummy').should.be.true # no context to the interpreter
        @logger.log.calledOnceWith('running definitions').should.be.true
        @logger.error.calledWith('error in definitions').should.be.true
        @logger.error.calledWith('dump').should.be.true

    describe 'runFile', () =>

      it 'run command in a file', () =>
        @cm.runFile path.join(__dirname, '/test-commander-fast-command.cljs')
        @resolve()
        await spin 5
        @interpreter.execute.callCount.should.equal 1

      it 'error reading file', () =>
        @cm.runFile 'dummy-file.txt' # file doesn't exist
        await spin 5
        @interpreter.execute.callCount.should.equal 0
        @logger.error.calledWith("error accessing file 'dummy-file.txt'").should.be.true

    describe 'run', () =>

      it 'checks out the traffic light', () =>
        @device.trafficLight.isCheckedOut.should.be.false
        @cm.run('infinite command')
        await spin()
        @device.trafficLight.isCheckedOut.should.be.true

      it 'if no command is running, run it (fast command)', () =>
        @cm.run('fast command')
        @resolve()
        await spin()
        @interpreter.execute.calledOnceWith('fast command', {tl:@device.trafficLight}).should.be.true
        @logger.log.calledWith("device 999999: running 'fast command'").should.be.true
        @logger.log.calledWith("device 999999: finished 'fast command'").should.be.true

      it 'if no command is running, run it (infinite command)', () =>
        @cm.run('infinite command') # never resolved
        await spin()
        @interpreter.execute.calledOnceWith('infinite command', {tl:@device.trafficLight}).should.be.true
        @logger.log.calledOnceWith("device 999999: running 'infinite command'").should.be.true

      it 'command with error', () =>
        @cm.run('error command')
        error = new Error('bad command!')
        @reject error
        await spin()
        @interpreter.execute.calledOnceWith('error command', {tl:@device.trafficLight}).should.be.true
        @logger.log.calledOnceWith("device 999999: running 'error command'").should.be.true
        @logger.error.calledWith("device 999999: error in 'error command'").should.be.true
        @logger.error.calledWith(error.message).should.be.true

      it 'if the same command is already running, does nothing', () =>
        @cm.run('infinite command') # never resolved
        await spin()
        @cm.run('infinite command') # same command
        await spin()
        @interpreter.execute.calledOnceWith('infinite command', {tl:@device.trafficLight}).should.be.true
        @logger.log.calledWith("device 999999: skip 'infinite command'").should.be.true

      it 'if the same command has already finished, run it again (fast command)', () =>
        @cm.run('fast command')
        @resolve()
        @cm.run('fast command') # same command
        @resolve()
        await spin()
        @interpreter.execute.calledTwice.should.be.true
        @logger.log.callCount.should.equal 4

      it 'if another command is running, cancels and runs the new command', () =>
        @cm.run('infinite command')
        await spin()
        sinon.assert.calledOnce(@interpreter.execute)
        sinon.assert.calledWith(@interpreter.execute, 'infinite command', {tl:@device.trafficLight})
        @cm.run('fast command') # different command
        sinon.assert.calledWith(@interpreter.cancel)
        sinon.assert.calledWith(@logger.log, "device 999999: cancel 'infinite command'")
        @resolve() # resolve the commands (infinite command was cancelled and fast command ends fast)
        await spin()
        sinon.assert.calledWith(@logger.log, "device 999999: finished 'infinite command'")
        sinon.assert.calledWith(@logger.log, "device 999999: running 'fast command'")
        sinon.assert.calledWith(@logger.log, "device 999999: finished 'fast command'")

      it 'checks in the traffic light when disconnected', () =>
        @cm.run('infinite command')
        @device.trafficLight.isCheckedOut.should.be.true
        @device.disconnect()
        @resolve()
        @device.trafficLight.isCheckedOut.should.be.false

      it 'cancels and suspends the command when disconnected', () =>
        @cm.run('infinite command')
        await spin()
        @interpreter.execute.calledOnceWith('infinite command', {tl:@device.trafficLight}).should.be.true
        sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")
        @device.disconnect()
        sinon.assert.calledWith(@interpreter.cancel)
        @resolve() # cancel resolves the command
        await spin()
        sinon.assert.calledWith(@logger.log, "device 999999: disabled, suspending 'infinite command'")

      it 'resumes the running command when reconnected', () =>
        @cm.run('infinite command')
        @device.disconnect()
        @resolve()
        await spin()
        @device.connect() # reconnect
        @manager.emit('added')
        await spin()
        @interpreter.execute.callCount.should.equal 2
        sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")

      it 'reinstates the traffic light state when reconnected if not running a command', () =>
        @cm.run('fast command')
        @resolve()
        tl = @device.trafficLight # simulates a command that ended with the yellow light on
        tl.yellow.turnOn()
        @device.turn.callCount.should.equal 1
        sinon.assert.calledWith(@device.turn, 1, 1) # yellow on
        @device.disconnect()
        @device.connect() # reconnect
        @manager.emit('add')
        @device.turn.callCount.should.equal 4 # called again for each light
        sinon.assert.calledWith(@device.turn, 0, 0) # red off
        sinon.assert.calledWith(@device.turn, 1, 1) # yellow on
        sinon.assert.calledWith(@device.turn, 2, 0) # green off
        tl.red.on.should.be.false
        tl.yellow.on.should.be.true
        tl.green.on.should.be.false

      it 'does not resume a command that already ended when reconnected', () =>
        @cm.run('fast command')
        @resolve() # end the command
        @device.disconnect()
        @device.connect()
        @manager.emit('add')
        await spin()
        @interpreter.execute.callCount.should.equal 1

    describe 'multiple Commanders competing for a device', () =>

      beforeEach () =>
        @interpreter2 =
          execute: sinon.stub().returns new Promise (resolve, reject) =>
            @resolve2 = resolve
            @reject2 = reject
          cancel: sinon.stub()
        @logger2 =
          log: sinon.stub()
          error: sinon.stub()
        @cm2 = new Commander {parser: @interpreter2, @manager, logger: @logger2}

      it 'second commander should NOT run', () =>
        @cm.run('infinite command')
        @cm2.run('infinite command')
        await spin()
        @interpreter.execute.callCount.should.equal 1
        @interpreter2.execute.callCount.should.equal 0 # commander 2 not executed

      it 'only one Commander executes when the device is reconnected', () =>
        @cm.run('infinite command')
        @cm2.run('infinite command')
        @device.disconnect()
        @resolve()
        await spin()
        @device.connect() # reconnect
        @manager.emit('added')
        await spin()
        # one of the Commanders should take control of the device
        if @cm.selector._device
          @interpreter.execute.callCount.should.equal 2
          @interpreter2.execute.callCount.should.equal 0
        else
          @interpreter.execute.callCount.should.equal 1
          @interpreter2.execute.callCount.should.equal 1

    describe 'disconnect and connect another device', () =>

      beforeEach () =>
        @device2 = new Device('888888', false) # device 2 is not connected
        @device2.turn = sinon.stub() # abstract in Device
        @manager.allDevices.returns [@device, @device2]

      it 'resumes the running command after disconnection in another device', () =>
        @cm.run('infinite command')
        await spin()
        sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")
        @device.disconnect()
        @resolve()
        await spin()
        sinon.assert.calledWith(@logger.log, "device 999999: disabled, suspending 'infinite command'")
        @device2.connect() # connect device 2
        @manager.emit('added')
        await spin()
        @interpreter.execute.callCount.should.equal 2
        sinon.assert.calledWith(@logger.log, "device 888888: running 'infinite command'")

    describe 'device specific Commander', () =>

      beforeEach () =>
        @cm = new Commander {@interpreter, @manager, @logger, serialNum: '999998'}

      it 'wrong device connected, should not run a command', () =>
        @cm.run('fast command')
        await spin()
        @interpreter.execute.callCount.should.equal 0
        sinon.assert.calledWith(@logger.log, "no traffic light available to run 'fast command'")

      it 'right device connected, should run a command', () =>
        @device2 = new Device('999998') # right device
        @device2.turn = sinon.stub() # abstract in Device
        @manager.allDevices.returns [@device, @device2]
        @cm.run('fast command')
        @resolve()
        await spin()
        @interpreter.execute.calledOnceWith('fast command', {tl:@device2.trafficLight}).should.be.true
        @logger.log.calledWith("device 999998: running 'fast command'").should.be.true
        @logger.log.calledWith("device 999998: finished 'fast command'").should.be.true

  describe 'no device', () =>

    it 'should not run a command', () =>
      @cm.run('fast command')
      await spin()
      @interpreter.execute.callCount.should.equal 0
      sinon.assert.calledWith(@logger.log, "no traffic light available to run 'fast command'")

    it 'runs the command when a device is connected', () =>
      @cm.run('fast command')
      await spin()
      @device = new Device('888888', true)
      @device.turn = sinon.stub()
      @manager.allDevices.returns [@device]
      @manager.emit('added') # new device added (detected)
      await spin()
      @interpreter.execute.calledOnce.should.be.true
      sinon.assert.calledWith(@interpreter.execute, 'fast command', {tl:@device.trafficLight})

  describe 'command help', () =>

    beforeEach () =>
      @commandNames = ['move','turn','stop']
      moveCommand = sinon.stub()
      moveCommand.meta =
        name: 'move'
        desc: 'Moves the widget'
        params: [ name: 'where' ]
      @interpreter.commandNames = @commandNames
      @interpreter.commands = move: moveCommand
      @interpreter.lookup = (name) -> @.commands[name]

    it 'commandNames: lists all available commands', () =>
      @cm.commandNames.should.deep.equal @commandNames

    it 'help: log help for a command', () =>
      @cm.help('move')
      sinon.assert.calledWith(@logger.log, 'move :where\nMoves the widget\n')
