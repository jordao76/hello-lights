require '../setup-unhandled-rejection'
{Cancellable} = require '../../src/commands/cancellable'
c = (require '../../src/commands/base-commands').commands
require('chai').should()
sinon = require 'sinon'

describe 'Base Commands', () ->

  describe 'cancel', () ->

    it 'should cancel the given cancellable', () ->
      ct = new Cancellable
      ct.cancel = sinon.stub()
      c.cancel {ct}
      ct.cancel.callCount.should.equal 1

    it 'should NOT cancel if already cancelled', () ->
      ct = new Cancellable
      ct.cancel()
      ct.cancel = sinon.stub()
      c.cancel {ct}
      ct.cancel.callCount.should.equal 0

  describe 'Timing commands', () ->

    beforeEach () -> @clock = sinon.useFakeTimers()
    afterEach () -> @clock.restore()

    describe 'pause', () ->

      it 'should pause for 500ms', (done) ->
        paused = false
        run = () ->
          await c.pause [500]
          paused = true
        run().then () ->
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 500

      it 'should be cancellable', (done) ->
        paused = false
        run = () ->
          await c.pause [5000]
          paused = true
        run().then () ->
          paused.should.be.true
          done()
        paused.should.be.false
        @clock.tick 4000
        c.cancel()

      it 'should NOT pause if already cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        await c.pause {ct}, [500]
        # test shouldn't timeout

    describe 'timeout', () ->

      beforeEach () ->
        @token = null

      it 'should cancel when the timeout is reached', (done) ->
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [25000]
          await c.timeout {}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.true
          done()
        @clock.tick 6000

      it 'the timeout itself should be cancellable', (done) ->
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [25000]
          await c.timeout {}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.true
          done()
        c.cancel()

      it 'should NOT cancel when the command ends before the timeout', (done) ->
        run = () =>
          command = ({tl, ct}) =>
            @token = ct
            c.pause {ct}, [250]
          await c.timeout {}, [5000, command]
        run().then () =>
          @token.isCancelled.should.be.false
          done()
        @clock.tick 250

      it 'should NOT call the command if already cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        command = sinon.stub()
        await c.timeout {ct}, [5000, command]
        # test shouldn't timeout
        command.callCount.should.equal 0

    describe 'all', () ->

      it 'should run commands in parallel', (done) ->
        c1CallCount = 0
        c2CallCount = 0
        c1 = ({tl, ct}) =>
          c1CallCount++
          c.pause {ct}, [500]
        c2 = ({tl, ct}) =>
          c2CallCount++
          c.pause {ct}, [500]
        run = () =>
          await c.all {}, [c1, c2]
        run().then () =>
          c1CallCount.should.equal 1
          c2CallCount.should.equal 1
          done()
        @clock.tick 500

      it 'should NOT run commands in parallel if already cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        c1CallCount = 0
        c2CallCount = 0
        c1 = ({tl, ct}) =>
          c1CallCount++
          c.pause {ct}, [500]
        c2 = ({tl, ct}) =>
          c2CallCount++
          c.pause {ct}, [500]
        await c.all {ct}, [c1, c2]
        c1CallCount.should.equal 0
        c2CallCount.should.equal 0

  describe 'Sequencing commands', () ->

    describe 'do', () ->

      it 'should execute the given commands in sequence', () ->
        c1 = sinon.stub()
        c2 = sinon.stub()
        await c.do {}, [c1, c2]
        c1.callCount.should.equal 1
        c2.callCount.should.equal 1

      it 'should stop when cancelled', () ->
        c1 = sinon.stub().callsFake ({ct}) -> c.cancel {ct}
        c2 = sinon.stub()
        await c.do {}, [c1, c2]
        c1.callCount.should.equal 1
        c2.callCount.should.equal 0 # got cancelled before it had a chance to run c2

      it 'should NOT run when cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        c1 = sinon.stub()
        c2 = sinon.stub()
        await c.do {ct}, [c1, c2]
        c1.callCount.should.equal 0
        c2.callCount.should.equal 0

    describe 'loop', () ->

      it 'should execute the given commands in a loop, cancel to break out of the loop (default cancellable)', () ->
        c1 = sinon.stub()
        c2 = sinon.stub().callsFake () ->
          c1.callsFake ({ct}) ->
            # cancel after the first pass
            c.cancel {ct}
        await c.loop {}, [c1, c2]
        c1.callCount.should.equal 2
        c2.callCount.should.equal 1

      it 'should execute the given commands in a loop, cancel to break out of the loop (custom cancellable)', () ->
        cancellable = new Cancellable
        c1 = sinon.stub()
        c2 = sinon.stub().callsFake () ->
          c1.callsFake ({ct}) ->
            # cancel after the first pass
            ct.should.equal cancellable
            c.cancel {ct}
        await c.loop {ct: cancellable}, [c1, c2]
        c1.callCount.should.equal 2
        c2.callCount.should.equal 1

      it 'should NOT run when cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        c1 = sinon.stub()
        c2 = sinon.stub()
        await c.loop {ct}, [c1, c2]
        c1.callCount.should.equal 0
        c2.callCount.should.equal 0

    describe 'repeat', () ->

      it 'should execute the given commands in sequence twice', () ->
        c1 = sinon.stub()
        c2 = sinon.stub()
        await c.repeat {}, [2, c1, c2]
        c1.callCount.should.equal 2
        c2.callCount.should.equal 2

      it 'should stop when cancelled', () ->
        c1 = sinon.stub().callsFake ({ct}) -> c.cancel {ct}
        c2 = sinon.stub()
        await c.repeat {}, [2, c1, c2]
        c1.callCount.should.equal 1
        c2.callCount.should.equal 0 # got cancelled before it had a chance to run c2

      it 'should NOT run when cancelled', () ->
        ct = new Cancellable
        ct.cancel()
        c1 = sinon.stub()
        c2 = sinon.stub()
        await c.repeat {ct}, [2, c1, c2]
        c1.callCount.should.equal 0
        c2.callCount.should.equal 0
