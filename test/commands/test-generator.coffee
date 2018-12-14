require '../setup-unhandled-rejection'
{Parser, Analyzer, Generator} = require '../../src/commands'
{isCommand} = require '../../src/commands/validation'
should = require('chai').should()
sinon = require('sinon')

describe 'Command Generator', () ->

  beforeEach () ->

    @isValid = sinon.stub().returns true
    @isValid.exp = 'something valid'

    # commands
    @turn = sinon.stub()
    @turn.meta =
      name: 'turn'
      params: [ name: 'direction', validate: @isValid ]
    @move = sinon.stub()
    @move.meta =
      name: 'move'
      params: [ name: 'how-much', validate: @isValid ]
    @do = sinon.stub()
    @do.meta =
      name: 'do'
      params: [ name: 'rest', validate: isCommand, isRest: yes ]

    # symbol table, all known commands
    @commands = { @turn, @move, @do }

    # generator
    parser = new Parser()
    analyzer = new Analyzer(@commands)
    @generator = new Generator()
    @generate = (text) => @generator.generate analyzer.analyze parser.parse text
    @ctx = {}

  it 'call a command with an argument', () ->
    act = @generate 'turn north'
    @generator.errors.length.should.equal 0
    act.length.should.equal 1
    cmd = act[0]
    cmd @ctx
    @turn.calledOnceWith(@ctx, ['north']).should.be.true

  it 'call a command with an undefined variable', () ->
    act = @generate 'turn :where'
    @generator.errors.should.deep.equal [
      type: 'error'
      text: '"where" is not defined'
      loc: '1:6-1:11'
    ]
    should.not.exist act

  it 'call multiple commands with the same undefined variable', () ->
    act = @generate '(turn :where) (move :where)'
    @generator.errors.should.deep.equal [
      { type: 'error', text: '"where" is not defined', loc: '1:7-1:12' }
      { type: 'error', text: '"where" is not defined', loc: '1:21-1:26' }
    ]
    should.not.exist act

  it 'call nested commands with the same undefined variable', () ->
    act = @generate 'do (turn :where) (move :where)'
    @generator.errors.should.deep.equal [
      { type: 'error', text: '"where" is not defined', loc: '1:10-1:15' }
      { type: 'error', text: '"where" is not defined', loc: '1:24-1:29' }
    ]
    should.not.exist act

  it 'call nested commands with different undefined variables', () ->
    act = @generate 'do (turn :where) (move :when)'
    @generator.errors.should.deep.equal [
      { type: 'error', text: '"where" is not defined', loc: '1:10-1:15' }
      { type: 'error', text: '"when" is not defined', loc: '1:24-1:28' }
    ]
    should.not.exist act

  it 'call a command with a rest param', () ->
    act = @generate 'do 1 2 3'
    @generator.errors.length.should.equal 0
    act.length.should.equal 1
    cmd = act[0]
    cmd @ctx
    @do.calledOnceWith(@ctx, [1, 2, 3]).should.be.true

  it 'call a command with a rest param and nested commands', () ->
    act = @generate 'do (turn 1) (move 2)'
    @generator.errors.length.should.equal 0
    act.length.should.equal 1
    cmd = act[0]
    cmd @ctx
    @do.callCount.should.equal 1
    doCall = @do.getCall(0) # do(@ctx, [turnCmd, moveCmd])
    ctx = doCall.args[0]
    ctx.should.equal @ctx
    [turnCmd, moveCmd] = doCall.args[1]
    @turn.callCount.should.equal 0
    @move.callCount.should.equal 0
    turnCmd @ctx # turn(@ctx, [1])
    moveCmd @ctx # move(@ctx, [2])
    @turn.calledOnceWith(@ctx, [1]).should.be.true
    @move.calledOnceWith(@ctx, [2]).should.be.true

  it 'null "nodes"', () ->
    act = @generator.generate null
    should.not.exist act
