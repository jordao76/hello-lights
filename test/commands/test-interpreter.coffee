require '../setup-unhandled-rejection'
{Interpreter} = require '../../src/commands'
chai = require 'chai'
chai.use require 'chai-as-promised'
should = chai.should()
sinon = require('sinon')

describe 'Command Interpreter', () ->

  beforeEach () ->

    @isValid = sinon.stub().returns true
    @isValid.exp = 'something valid'

    # commands
    @turn = sinon.stub().returns 42
    @turn.meta =
      name: 'turn'
      params: [ name: 'direction', validate: @isValid ]
    @loop = ({handle, ct}) ->
      i = 0 # number of loop counts
      while ++i
        return i if ct.isCancelled # exit with the loop count if cancelled
        await handle() # wait for handle() to resolve
    @loop.meta =
      name: 'loop'
      params: []

    # symbol table, all known commands
    @commands = { @turn, @loop }

    # interpreter
    @interpreter = new Interpreter(@commands)
    @ct = isCancelled: no

  it 'list all commands names', () ->
    names = @interpreter.commandNames
    names.should.deep.equal [
      # base commands
      'def', 'define', 'cancel', 'pause', 'timeout', 'do',
      'loop', # loop was overwritten
      'repeat', 'all',
      # specific commands
      'turn'
    ]

  it 'add a new command', () ->
    newCommand = sinon.stub()
    newCommand.meta = name: 'new-command'
    @interpreter.add 'new-command', newCommand
    names = @interpreter.commandNames
    names.should.deep.equal [
      'def', 'define', 'cancel', 'pause', 'timeout', 'do',
      'loop', 'repeat', 'all',
      'turn', 'new-command'
    ]

  it 'call a command', () ->
    res = await @interpreter.execute 'turn north', {}, @ct
    res.should.deep.equal [42]
    @turn.calledOnceWith({@ct}, ['north']).should.be.true

  it 'call with default cancellation token', () ->
    res = await @interpreter.execute 'turn north', {}
    res.should.deep.equal [42]
    @turn.callCount.should.equal 1
    ctx = @turn.getCall(0).args[0]
    should.exist ctx.ct
    ctx.ct.isCancelled.should.be.false
    @turn.getCall(0).args[1].should.deep.equal ['north']

  it 'call and cancel in the middle of a command execution', () ->
    resolve = null
    handle = () -> new Promise((r) -> resolve = r)
    promise = @interpreter.execute 'loop', {handle}
    @interpreter.cancel() # cancels the loop
    @interpreter.ct.isCancelled.should.be.false # cancellation token re-instantiated
    resolve() # resolves the promise
    res = await promise
    res.should.deep.equal [2] # two passes through the loop

  it 'call and cancel external cancellation token', () ->
    resolve = null
    handle = () -> new Promise((r) -> resolve = r)
    ct = { isCancelled: no, cancel: () -> @isCancelled = yes }
    promise = @interpreter.execute 'loop', {handle}, ct
    @interpreter.cancel ct # cancels the loop
    ct.isCancelled.should.be.true # external cancellation token not re-instantiated
    resolve() # resolves the promise
    res = await promise
    res.should.deep.equal [2] # two passes through the loop

  it 'call and cancel the interpreter token directly in the middle of a command execution', () ->
    resolve = null
    handle = () -> new Promise((r) -> resolve = r)
    promise = @interpreter.execute '(loop) (turn north)', {handle}
    @interpreter.ct.cancel() # cancel directly, bypassing @interpreter.cancel()
    @interpreter.ct.isCancelled.should.be.true
    resolve() # resolves the promise
    res = await promise
    @interpreter.ct.isCancelled.should.be.false # cancellation token re-instantiated
    res.should.deep.equal [2] # two passes through the loop
    @turn.callCount.should.equal 0 # didn't reach '(turn north)'

  it 'call with default context and cancellation token', () ->
    res = await @interpreter.execute 'turn north'
    res.should.deep.equal [42]
    @turn.callCount.should.equal 1
    ctx = @turn.getCall(0).args[0]
    should.exist ctx
    should.exist ctx.ct
    ctx.ct.isCancelled.should.be.false
    @turn.getCall(0).args[1].should.deep.equal ['north']

  it 'call with cancelled cancellation token', () ->
    res = await @interpreter.execute 'turn north', {}, {isCancelled: yes}
    res.should.deep.equal [] # no results
    @turn.callCount.should.equal 0

  it 'cancel with cancelled cancellation token', () ->
    ct = { isCancelled: yes, cancel: sinon.stub() }
    await @interpreter.execute 'turn north', {}, ct
    @interpreter.cancel ct
    ct.cancel.callCount.should.equal 0 # ct.cancel() not called since it was already cancelled
    @turn.callCount.should.equal 0

  it 'call a command with a context; the cancellation token is added to the context', () ->
    ctx = {anything: 'goes'}
    res = await @interpreter.execute 'turn north', ctx, @ct
    res.should.deep.equal [42]
    @turn.calledOnceWith({...ctx, @ct}, ['north']).should.be.true

  it 'call multiple commands', () ->
    res = await @interpreter.execute '(turn north)(turn south)', {}, @ct
    res.should.deep.equal [42, 42]
    @turn.calledWith({@ct}, ['north']).should.be.true
    @turn.calledWith({@ct}, ['south']).should.be.true

  it 'syntax error', () ->
    res = @interpreter.execute '(turn $)'
    res.should.be.rejectedWith '1:7-1:8: SyntaxError: Expected "(", ")", ":", ";", "\\"", [ \\t\\r\\n], [0-9], or [a-z_] but "$" found.'

  it 'semantic error', () ->
    res = @interpreter.execute '(turning north)'
    res.should.be.rejectedWith '1:2-1:14: Command not found: "turning"'

  it 'generation error', () ->
    res = @interpreter.execute '(turn :where)'
    res.should.be.rejectedWith '1:7-1:12: "where" is not defined'

  it 'define and call later', () ->
    await @interpreter.execute 'def turning (turn :where)'
    res = await @interpreter.execute 'turning north', {}, @ct
    res.should.deep.equal [42]
    @turn.calledWith({ @ct, scope: { where: 'north' } }, ['north']).should.be.true

  it 'define and call', () ->
    res = await @interpreter.execute '(def turning (turn :where)) (turning north)', {}, @ct
    res.should.deep.equal [42]
    @turn.calledWith({ @ct, scope: { where: 'north' } }, ['north']).should.be.true
