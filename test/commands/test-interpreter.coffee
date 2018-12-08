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
    @turn.name = 'turn'
    @turn.params = [ name: 'direction', validate: @isValid ]

    # symbol table, all known commands
    @commands = { @turn }

    # interpreter
    @interpreter = new Interpreter(@commands)

  it 'call a command', () ->
    res = await @interpreter.execute 'turn north'
    res.should.deep.equal [42]
    @turn.calledOnceWith({}, ['north']).should.be.true

  it 'call a command with a context', () ->
    ctx = { anything: 'goes' }
    res = await @interpreter.execute 'turn north', ctx
    res.should.deep.equal [42]
    @turn.calledOnceWith(ctx, ['north']).should.be.true

  it 'call multiple commands', () ->
    res = await @interpreter.execute '(turn north)(turn south)'
    res.should.deep.equal [42, 42]
    @turn.calledWith({}, ['north']).should.be.true
    @turn.calledWith({}, ['south']).should.be.true

  it 'syntax error', () ->
    res = @interpreter.execute '(turn $)'
    res.should.be.rejectedWith '1:7-1:8: SyntaxError: Expected "(", ")", ":", ";", "\\"", [ \\t\\r\\n], [0-9], or [a-z_] but "$" found.'

  it 'semantic error', () ->
    res = @interpreter.execute '(turning north)'
    res.should.be.rejectedWith '1:2-1:14: Command not found: "turning"'

  it 'generation error', () ->
    res = @interpreter.execute '(turn :where)'
    res.should.be.rejectedWith '1:7-1:12: "where" is not defined'

  it 'define and call', () ->
    res = await @interpreter.execute '(def turning (turn :where)) (turning north)'
    res.should.deep.equal [42]
    @turn.calledWith({ scope: { where: 'north' } }, ['north']).should.be.true
