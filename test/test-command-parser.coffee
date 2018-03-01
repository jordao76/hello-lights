CommandParser = require '../src/command-parser'
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

  it 'should parse array parameters', () =>
    @commands.turn = sinon.stub().returns 97
    commandStr = 'turn (red green yellow 10) 100'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['turn'](tl,['red', 'green', 'yellow', 10], 100, ct)
    res = await command(@tl, 80)
    sinon.assert.calledWith(
      @commands.turn, @tl, ['red', 'green', 'yellow', 10], 100, 80)
    res.should.equal 97

  it 'should return an error for an invalid command name', () =>
    commandStr = 'invalid red'
    command = @cp.parse(commandStr)
    command.should.be.an.instanceof Error
    command.toString().should.have.string 'Command not found: "invalid"'

  xit 'should call a parameter validation function', () =>
    isValid = sinon.stub().returns yes
    @commands.turnOn = (tl, light, ct) ->
    @commands.turnOn.validation = [isValid]
    commandStr = 'turnOn red'
    command = @cp.parse(commandStr)
    command.should.not.be.an.instanceof Error
    sinon.assert.calledOnce(isValid)
