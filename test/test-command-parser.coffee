{CommandParser} = require '../src/command-parser'
c = require '../src/commands'
require('chai').should()
sinon = require('sinon')

describe 'CommandParser', () ->

  beforeEach () =>
    @commands = {}
    @cp = new CommandParser(@commands)
    @tl = red:32, yellow:33, green:34

  it 'should parse a parameterless command', () =>
    @commands.cycle = sinon.stub().returns 96
    commandStr = 'cycle'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['cycle'](tl, ct)
    res = await command(@tl, 79)
    sinon.assert.calledWith(@commands.cycle, @tl, 79)
    res.should.equal 96

  it 'should parse a command with parameters', () =>
    @commands.blink = sinon.stub().returns 95
    commandStr = 'blink red 500 10'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['blink'](tl, 'red', 500, 10, ct)
    res = await command(@tl, 78)
    sinon.assert.calledWith(@commands.blink, @tl, 'red', 500, 10, 78)
    res.should.equal 95

  it 'should parse sub-command', () =>
    @commands.repeat = (tl, n, c, ct) -> c(tl, ct)
    @commands.toggle = sinon.stub().returns 97
    commandStr = 'repeat 100 (toggle green)'
    command = @cp.parse(commandStr)
    res = await command(@tl, 80)
    sinon.assert.calledWith @commands.toggle, @tl, 'green', 80
    res.should.equal 97

  it 'should return an error for an invalid command name', () =>
    commandStr = 'invalid red'
    command = @cp.parse(commandStr)
    command.should.be.an.instanceof Error
    command.toString().should.have.string 'Command not found: "invalid"'

  describe 'transformation', () =>

    it 'should call a transformation', () =>
      @commands.sum = (tl, a, ct) -> a
      @commands.sum.transformation = (args) -> [args.reduce((a, b) -> a + b)]
      commandStr = 'sum 1 2 3 4'
      command = @cp.parse(commandStr)
      # command will be
      #   (tl, ct) => @commands['sum'](tl, 10, ct)
      res = await command(@tl, 79)
      res.should.equal 10

    it 'use a transformation for a rest parameter', () =>
      isValid = () -> yes
      splitter = (n) -> (a) -> [...a.slice(0, n), a.slice(n)]
      @commands.takesRest = sinon.stub().returns 94
      @commands.takesRest.transformation = splitter 2
      commandStr = 'takesRest 1 2 3 4'
      command = @cp.parse(commandStr)
      # command will be
      #   (tl, ct) => @commands['takesRest'](tl, 1, 2, [3, 4], ct)
      res = await command(@tl, 79)
      sinon.assert.calledWith(@commands.takesRest, @tl, 1, 2, [3, 4], 79)
      res.should.equal 94

  describe 'validation', () =>

    beforeEach () =>
      @isValid = sinon.stub()
      @commands.turnOn = sinon.stub()
      @commands.turnOn.validation = [@isValid]
      @commands.turnOn.doc = usage: 'turnOn [red|yellow|green]'

    it 'should validate a parameter', () =>
      @isValid.returns yes
      commandStr = 'turnOn red'
      command = @cp.parse(commandStr)
      command.should.not.be.an.instanceof Error
      sinon.assert.calledOnce(@isValid)
      sinon.assert.calledWith(@isValid, 'red')
      await command(@tl, 42)
      sinon.assert.calledWith(@commands.turnOn, @tl, 'red', 42)

    it 'should return a validation error for an invalid argument', () =>
      @isValid.returns no
      commandStr = 'turnOn blue'
      command = @cp.parse(commandStr)
      command.should.be.an.instanceof Error
      command.toString().should.have.string 'Check your arguments: turnOn [red|yellow|green]'

    it 'should return a validation error for a missing parameter', () =>
      @isValid.returns yes
      commandStr = 'turnOn'
      command = @cp.parse(commandStr)
      command.should.be.an.instanceof Error
      command.toString().should.have.string 'Check your arguments: turnOn [red|yellow|green]'

    it 'should return a validation error for an extra parameter', () =>
      @isValid.returns yes
      commandStr = 'turnOn red 1'
      command = @cp.parse(commandStr)
      command.should.be.an.instanceof Error
      command.toString().should.have.string 'Check your arguments: turnOn [red|yellow|green]'
