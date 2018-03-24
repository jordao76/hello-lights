{Commander} = require '../src/commander'
{Device, DeviceManager} = require '../src/device'
require('chai').should()
sinon = require('sinon')
yieldThen = (fn) => setTimeout(fn, 0)

describe 'Commander', () =>

  beforeEach () =>
    @parser =
      execute: sinon.stub().returns new Promise (resolve, reject) =>
        @resolve = resolve
        @reject = reject
      cancel: sinon.stub()
    @device = new Device('999999', true)
    @device.turn = sinon.stub() # abstract in Device
    manager = new DeviceManager 'stub'
    manager.allDevices = sinon.stub().returns [@device]
    @logger =
      log: sinon.stub()
      error: sinon.stub()
    @cm = new Commander {@parser, manager, @logger}

  describe 'devices info', () =>

    it 'devicesInfo', () =>
      @cm.devicesInfo().should.deep.equal [{ type: 'stub', serialNum: '999999', status: 'connected' }]

    it 'logDevicesInfo', () =>
      @cm.logDevicesInfo()
      @logger.log.calledOnceWith('device 999999: connected').should.be.true

  describe 'run', () =>

    it 'if no command is running, run it (fast command)', (done) =>
      @cm.run('fast command');
      @resolve()
      yieldThen () =>
        @parser.execute.calledOnceWith('fast command', @device.trafficLight()).should.be.true
        @logger.log.calledWith("device 999999: running 'fast command'").should.be.true
        @logger.log.calledWith("device 999999: finished 'fast command'").should.be.true
        done()

    it 'if no command is running, run it (infinite command)', (done) =>
      @cm.run('infinite command'); # never resolved
      yieldThen () =>
        @parser.execute.calledOnceWith('infinite command', @device.trafficLight()).should.be.true
        @logger.log.calledOnceWith("device 999999: running 'infinite command'").should.be.true
        done()

    it 'command with error', (done) =>
      @cm.run('error command');
      error = new Error('bad command!')
      @reject error
      yieldThen () =>
        @parser.execute.calledOnceWith('error command', @device.trafficLight()).should.be.true
        @logger.log.calledOnceWith("device 999999: running 'error command'").should.be.true
        @logger.error.calledWith("device 999999: error in 'error command'").should.be.true
        @logger.error.calledWith(error).should.be.true
        done()

    it 'if the same command is already running, does nothing', (done) =>
      @cm.run('infinite command'); # never resolved
      yieldThen () =>
        @cm.run('infinite command'); # same command
        yieldThen () =>
          @parser.execute.calledOnceWith('infinite command', @device.trafficLight()).should.be.true
          @logger.log.calledWith("device 999999: skip 'infinite command'").should.be.true
          done()

    it 'if the same command has already finished, run it again (fast command)', (done) =>
      @cm.run('fast command');
      @resolve()
      yieldThen () =>
        @cm.run('fast command'); # same command
        @resolve()
        yieldThen () =>
          @parser.execute.calledTwice.should.be.true
          @logger.log.callCount.should.equal 4
          done()

    it 'if another command is running: cancels and runs the new command', (done) =>
      @cm.run('infinite command');
      yieldThen () =>
        sinon.assert.calledOnce(@parser.execute)
        sinon.assert.calledWith(@parser.execute, 'infinite command', @device.trafficLight())
        @cm.run('fast command'); # different command
        yieldThen () =>
          sinon.assert.calledWith(@parser.cancel)
          sinon.assert.calledWith(@logger.log, "device 999999: cancel 'infinite command'")
          @resolve() # resolve the commands (infinite command was cancelled and fast command ends fast)
          yieldThen () =>
            sinon.assert.calledWith(@logger.log, "device 999999: finished 'infinite command'")
            sinon.assert.calledWith(@logger.log, "device 999999: running 'fast command'")
            sinon.assert.calledWith(@logger.log, "device 999999: finished 'fast command'")
            done()

    xit 'suspends the command when disconnected', (done) =>
      # device 999999: disconnected, suspending `command`
    xit 'resumes the command when reconnected', (done) =>
      # device 999999: disconnected, suspending `command`
      # device 999999: connected, resuming `command`
      # device 999998: connected, resuming `command`

    describe 'disconnected or no device', () =>

      beforeEach () =>
        @device.disconnect()

      it 'should not run and log a message', (done) =>
        @cm.run('fast command');
        yieldThen () =>
          @parser.execute.callCount.should.equal 0
          sinon.assert.calledWith(@logger.log, "no device found to run 'fast command'")
          done()

      xit 'runs the command when connected', (done) =>

  describe 'help', () =>
