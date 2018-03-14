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

  it 'spaces surrounding parenthesis should be allowed', () =>
    @commands.repeat = (tl, n, c, ct) -> c(tl, ct)
    @commands.toggle = sinon.stub()
    commandStr = 'repeat 100 ( toggle green )'
    command = @cp.parse(commandStr)
    res = await command(@tl, 80)
    sinon.assert.calledWith @commands.toggle, @tl, 'green', 80

  it 'should not require a space before an opening parenthesis', () =>
    @commands.run = (tl, c1, c2, ct) -> c1(tl, ct)
    @commands.toggle = sinon.stub()
    commandStr = 'run(toggle green)( toggle red)'
    command = @cp.parse(commandStr)
    res = await command(@tl, 80)
    sinon.assert.calledWith @commands.toggle, @tl, 'green', 80

  it 'should pass the parser to a command that needs it', () =>
    @commands.needsParser = sinon.stub().returns 95
    @commands.needsParser.usesParser = true
    commandStr = 'needsParser'
    command = @cp.parse(commandStr)
    res = await command(@tl, 80)
    sinon.assert.calledWith @commands.needsParser, @cp, @tl, 80
    res.should.equal 95

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

  describe 'variables', () =>

    it 'should parse a command with a variable', () =>
      @commands.pause = sinon.stub().returns 42
      commandStr = 'pause :ms'
      command = @cp.parse(commandStr)
      # command will be
      #   (tl, ms, ct) => @commands['pause'](tl, ms, ct)
      res = await command(@tl, 44, {ms: 33})
      sinon.assert.calledWith(@commands.pause, @tl, 33, 44)
      res.should.equal 42

    it 'should parse a command with a variable and a value', () =>
      @commands.my_command = sinon.stub()
      command = @cp.parse('my_command :ms 7')
      res = await command(@tl, 4, {ms: 3})
      sinon.assert.calledWith(@commands.my_command, @tl, 3, 7, 4)

    it 'should parse a command with two variables', () =>
      @commands.my_command = sinon.stub()
      command = @cp.parse('my_command :v1 :v2')
      res = await command(@tl, 5, {v2: 3, v1: 4})
      sinon.assert.calledWith(@commands.my_command, @tl, 4, 3, 5)

    xit 'should parse a command with a nested command with a variable', () =>
      @commands.run = (tl, command, ct) -> command(tl, ct)
      @commands.toggle = sinon.stub()
      command = @cp.parse('run (toggle :light)')
      res = await command(@tl, -1, {light: 'red'})
      sinon.assert.calledWith(@commands.toggle, @tl, 'red', -1)

    xit 'should parse a command with nested commands with variables', () =>
      @commands.run = sinon.stub()
      @commands.toggle = sinon.stub()
      @commands.pause = sinon.stub()
      command = @cp.parse('run (toggle :light) (pause :ms) (toggle :light)')
      res = await command(@tl, -1, {light: 'red', ms: 150})
      sinon.assert.calledWith(@commands.run, @tl, 'red', 150, -1)
      sinon.assert.calledWith(@commands.pause, @tl, 150, -1)
      sinon.assert.calledWith(@commands.toggle, @tl, 'red', -1)
      sinon.assert.calledTwice(@commands.toggle)

    xdescribe 'variables and validation', () ->
