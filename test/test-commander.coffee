{Commander} = require '../src/commander'
{Device, DeviceManager} = require '../src/device'
require('chai').should()
sinon = require('sinon')
yieldThen = (fn) => setTimeout(fn, 0)

DEBUG_STUB = (stub) ->
  console.log 'STUB callCount', stub.callCount
  console.log stub.getCall(i).args for i in [0...stub.callCount]

describe 'Commander', () =>

  beforeEach () =>
    @parser =
      execute: sinon.stub().returns new Promise (resolve, reject) =>
        @resolve = resolve
        @reject = reject
      cancel: sinon.stub()
    @manager = new DeviceManager 'stub'
    @manager.allDevices = sinon.stub().returns []
    @logger =
      log: sinon.stub()
      error: sinon.stub()
    @cm = new Commander {@parser, @manager, @logger}

  describe 'connected device', () =>

    beforeEach () =>
      @device = new Device('999999', true)
      @device.turn = sinon.stub() # abstract in Device
      @manager.allDevices.returns [@device]

    describe 'devices info', () =>

      it 'devicesInfo', () =>
        @cm.devicesInfo().should.deep.equal [
          { type: 'stub', serialNum: '999999', status: 'connected' }
        ]

      it 'logDevicesInfo', () =>
        @cm.logDevicesInfo()
        @logger.log.calledWith('device 999999: connected').should.be.true

    describe 'run', () =>

      it 'checks out the traffic light', () =>
        @device.trafficLight.isCheckedOut.should.be.false
        @cm.run('infinite command')
        yieldThen () =>
          @device.trafficLight.isCheckedOut.should.be.true

      it 'if no command is running, run it (fast command)', (done) =>
        @cm.run('fast command')
        @resolve()
        yieldThen () =>
          @parser.execute.calledOnceWith('fast command', @device.trafficLight).should.be.true
          @logger.log.calledWith("device 999999: running 'fast command'").should.be.true
          @logger.log.calledWith("device 999999: finished 'fast command'").should.be.true
          done()

      it 'if no command is running, run it (infinite command)', (done) =>
        @cm.run('infinite command') # never resolved
        yieldThen () =>
          @parser.execute.calledOnceWith('infinite command', @device.trafficLight).should.be.true
          @logger.log.calledOnceWith("device 999999: running 'infinite command'").should.be.true
          done()

      it 'command with error', (done) =>
        @cm.run('error command')
        error = new Error('bad command!')
        @reject error
        yieldThen () =>
          @parser.execute.calledOnceWith('error command', @device.trafficLight).should.be.true
          @logger.log.calledOnceWith("device 999999: running 'error command'").should.be.true
          @logger.error.calledWith("device 999999: error in 'error command'").should.be.true
          @logger.error.calledWith(error.message).should.be.true
          done()

      it 'if the same command is already running, does nothing', (done) =>
        @cm.run('infinite command') # never resolved
        yieldThen () =>
          @cm.run('infinite command') # same command
          yieldThen () =>
            @parser.execute.calledOnceWith('infinite command', @device.trafficLight).should.be.true
            @logger.log.calledWith("device 999999: skip 'infinite command'").should.be.true
            done()

      it 'if the same command has already finished, run it again (fast command)', (done) =>
        @cm.run('fast command')
        @resolve()
        yieldThen () =>
          @cm.run('fast command') # same command
          @resolve()
          yieldThen () =>
            @parser.execute.calledTwice.should.be.true
            @logger.log.callCount.should.equal 4
            done()

      it 'if another command is running, cancels and runs the new command', (done) =>
        @cm.run('infinite command')
        yieldThen () =>
          sinon.assert.calledOnce(@parser.execute)
          sinon.assert.calledWith(@parser.execute, 'infinite command', @device.trafficLight)
          @cm.run('fast command') # different command
          yieldThen () =>
            sinon.assert.calledWith(@parser.cancel)
            sinon.assert.calledWith(@logger.log, "device 999999: cancel 'infinite command'")
            @resolve() # resolve the commands (infinite command was cancelled and fast command ends fast)
            yieldThen () =>
              sinon.assert.calledWith(@logger.log, "device 999999: finished 'infinite command'")
              sinon.assert.calledWith(@logger.log, "device 999999: running 'fast command'")
              sinon.assert.calledWith(@logger.log, "device 999999: finished 'fast command'")
              done()

      it 'checks in the traffic light when disconnected', (done) =>
        @cm.run('infinite command')
        yieldThen () =>
          @device.trafficLight.isCheckedOut.should.be.true
          @device.disconnect()
          yieldThen () =>
            @resolve()
            yieldThen () =>
              @device.trafficLight.isCheckedOut.should.be.false
              done()

      it 'cancels and suspends the command when disconnected', (done) =>
        @cm.run('infinite command')
        yieldThen () =>
          @parser.execute.calledOnceWith('infinite command', @device.trafficLight).should.be.true
          sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")
          @device.disconnect()
          yieldThen () =>
            sinon.assert.calledWith(@parser.cancel)
            @resolve() # cancel resolves the command
            yieldThen () =>
              sinon.assert.calledWith(@logger.log, "device 999999: disabled, suspending 'infinite command'")
              done()

      it 'resumes the running command when reconnected', (done) =>
        @cm.run('infinite command')
        yieldThen () =>
          @device.disconnect()
          yieldThen () =>
            @resolve()
            yieldThen () =>
              @device.connect() # reconnect
              @manager.emit('added')
              yieldThen () =>
                @parser.execute.callCount.should.equal 2
                sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")
                done()

      it 'reinstates the traffic light state when reconnected if not running a command', (done) =>
        @cm.run('fast command')
        @resolve()
        tl = @device.trafficLight # simulates a command that ended with the yellow light on
        tl.yellow.turnOn()
        @device.turn.callCount.should.equal 1
        sinon.assert.calledWith(@device.turn, 1, 1) # yellow on
        yieldThen () =>
          @device.disconnect()
          yieldThen () =>
            @device.connect() # reconnect
            @manager.emit('add')
            yieldThen () =>
              @device.turn.callCount.should.equal 4 # called again for each light
              sinon.assert.calledWith(@device.turn, 0, 0) # red off
              sinon.assert.calledWith(@device.turn, 1, 1) # yellow on
              sinon.assert.calledWith(@device.turn, 2, 0) # green off
              tl.red.on.should.be.false
              tl.yellow.on.should.be.true
              tl.green.on.should.be.false
              done()

      it 'does not resume a command that already ended when reconnected', (done) =>
        @cm.run('fast command')
        yieldThen () =>
          @resolve() # end the command
          yieldThen () =>
            @device.disconnect()
            yieldThen () =>
              @device.connect()
              @manager.emit('add')
              yieldThen () =>
                @parser.execute.callCount.should.equal 1
                done()

    describe 'multiple Commanders competing for a device', () =>

      beforeEach () =>
        @parser2 =
          execute: sinon.stub().returns new Promise (resolve, reject) =>
            @resolve2 = resolve
            @reject2 = reject
          cancel: sinon.stub()
        @logger2 =
          log: sinon.stub()
          error: sinon.stub()
        @cm2 = new Commander {parser: @parser2, @manager, logger: @logger2}

      it 'second commander should NOT run', (done) =>
        @cm.run('infinite command')
        @cm2.run('infinite command')
        yieldThen () =>
          @parser.execute.callCount.should.equal 1
          @parser2.execute.callCount.should.equal 0 # commander 2 not executed
          done()

      it 'only one Commander executes when the device is reconnected', (done) =>
        @cm.run('infinite command')
        @cm2.run('infinite command')
        yieldThen () =>
          @device.disconnect()
          yieldThen () =>
            @resolve()
            yieldThen () =>
              @device.connect() # reconnect
              @manager.emit('added')
              yieldThen () =>
                # one of the Commanders should take control of the device
                if @cm._device
                  @parser.execute.callCount.should.equal 2
                  @parser2.execute.callCount.should.equal 0
                else
                  @parser.execute.callCount.should.equal 1
                  @parser2.execute.callCount.should.equal 1
                done()

    describe 'disconnect and connect another device', () =>

      beforeEach () =>
        @device2 = new Device('888888', false) # device 2 is not connected
        @device2.turn = sinon.stub() # abstract in Device
        @manager.allDevices.returns [@device, @device2]

      it 'resumes the running command after disconnection in another device', (done) =>
        @cm.run('infinite command')
        yieldThen () =>
          sinon.assert.calledWith(@logger.log, "device 999999: running 'infinite command'")
          @device.disconnect()
          yieldThen () =>
            @resolve()
            yieldThen () =>
              sinon.assert.calledWith(@logger.log, "device 999999: disabled, suspending 'infinite command'")
              @device2.connect() # connect device 2
              @manager.emit('added')
              yieldThen () =>
                @parser.execute.callCount.should.equal 2
                sinon.assert.calledWith(@logger.log, "device 888888: running 'infinite command'")
                done()

    describe 'device specific Commander', () =>

      beforeEach () =>
        @cm = new Commander {@parser, @manager, @logger, serialNum: '999998'}

      it 'wrong device connected, should not run a command', (done) =>
        @cm.run('fast command')
        yieldThen () =>
          @parser.execute.callCount.should.equal 0
          sinon.assert.calledWith(@logger.log, "no traffic light available to run 'fast command'")
          done()

      it 'right device connected, should run a command', (done) =>
        @device2 = new Device('999998') # right device
        @device2.turn = sinon.stub() # abstract in Device
        @manager.allDevices.returns [@device, @device2]
        @cm.run('fast command')
        @resolve()
        yieldThen () =>
          @parser.execute.calledOnceWith('fast command', @device2.trafficLight).should.be.true
          @logger.log.calledWith("device 999998: running 'fast command'").should.be.true
          @logger.log.calledWith("device 999998: finished 'fast command'").should.be.true
          done()

  describe 'no device', () =>

    it 'should not run a command', (done) =>
      @cm.run('fast command')
      yieldThen () =>
        @parser.execute.callCount.should.equal 0
        sinon.assert.calledWith(@logger.log, "no traffic light available to run 'fast command'")
        done()

    it 'runs the command when a device is connected', (done) =>
      @cm.run('fast command')
      yieldThen () =>
        @device = new Device('888888', true)
        @device.turn = sinon.stub()
        @manager.allDevices.returns [@device]
        @manager.emit('added') # new device added (detected)
        yieldThen () =>
          @parser.execute.calledOnce.should.be.true
          sinon.assert.calledWith(@parser.execute, 'fast command', @device.trafficLight)
          done()

  describe 'command help', () =>

    beforeEach () =>
      @commandList = ['move','turn','stop']
      @parser.commandList = @commandList
      moveCommand = sinon.stub()
      moveCommand.paramNames = ['where']
      moveCommand.doc = name: 'move', desc: 'Moves the widget'
      @parser.commands = move: moveCommand

    it 'commands(): lists all available commands', () =>
      @cm.commands().should.deep.equal @commandList

    it 'help: log help for a command', () =>
      @cm.help('move')
      sinon.assert.calledWith(@logger.log, 'move :where')
      sinon.assert.calledWith(@logger.log, 'Moves the widget')
