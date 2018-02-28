CommandParser = require '../src/command-parser'
c = require '../src/commands'
require('chai').should()

describe 'CommandParser', () ->

  beforeEach () =>
    @commands = {}
    @cp = new CommandParser(@commands)
    @tl = red:32, yellow:33, green:34

  it 'should parse a parameterless traffic light command', () =>
    @commands.cycle = (tl,ct) ->
      @cycled=[tl,ct]
      return 96
    commandStr = 'cycle'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['cycle'](tl, ct)
    res = await c.run(command,@tl,79)
    @commands.cycled.should.deep.equal [@tl,79]
    res.should.equal 96

  it 'should parse a command with parameters', () =>
    @commands.blink = (tl,light,n1,n2,ct) ->
      @blinked=[tl,light,n1,n2,ct]
      return 95
    commandStr = 'blink red 500 10'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['blink'](tl, 'red', 500, 10, ct)
    res = await c.run(command,@tl,78)
    @commands.blinked.should.deep.equal [@tl,'red',500,10,78]
    res.should.equal 95

  it 'should parse array parameters', () =>
    @commands.turn = (tl,arr,n,ct) ->
      @turned=[tl,arr,n,ct]
      return 97
    commandStr = 'turn (red green yellow 10) 100'
    command = @cp.parse(commandStr)
    # command will be
    #   (tl, ct) => @commands['turn'](tl,['red', 'green', 'yellow', 10], 100, ct)
    res = await c.run(command,@tl,80)
    @commands.turned.should.deep.equal [@tl,['red','green','yellow',10],100,80]
    res.should.equal 97

  it 'should return an error for an invalid command name', () =>
    commandStr = 'invalid red'
    command = @cp.parse(commandStr)
    command.should.be.an.instanceof Error
    command.toString().should.have.string 'Command not found: "invalid"'
