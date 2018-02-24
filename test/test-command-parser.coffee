CommandParser = require '../src/command-parser'
c = require '../src/commands'
require('chai').should()

describe 'CommandParser', () ->

  commands = {}
  cp = new CommandParser(commands)
  tl = red:32, yellow:33, green:34

  it 'should parse a light command', () ->
    commands.blink = (light,n1,n2,ct) ->
      @blinked=[light,n1,n2,ct]
      return 95
    commandStr = 'blink red 500 10'
    command = cp.parse(commandStr)
    # command will be
    #   (tl, ct) => commands['blink'](tl['red'], 500, 10, ct)
    res = await c.run(command,tl,78)
    commands.blinked.should.deep.equal [tl.red,500,10,78]
    res.should.equal 95

  it 'should parse a traffic light command', () ->
    commands.cycle = (tl,ct) ->
      @cycled=[tl,ct]
      return 96
    commandStr = 'cycle'
    command = cp.parse(commandStr)
    # command will be
    #   (tl, ct) => commands['cycle'](tl, ct)
    res = await c.run(command,tl,79)
    commands.cycled.should.deep.equal [tl,79]
    res.should.equal 96

  it 'should parse array parameters', () ->
    commands.turn = (arr,n,ct) ->
      @turned=[arr,n,ct]
      return 97
    commandStr = 'turn (red green yellow 10) 100'
    command = cp.parse(commandStr)
    # command will be
    #   (tl, ct) => commands['turn']([tl.red, tl.green, tl.yellow, 10], 100, ct)
    res = await c.run(command,tl,80)
    commands.turned.should.deep.equal [[tl.red,tl.green,tl.yellow,10],100,80]
    res.should.equal 97

  it 'should parse string parameters that are not lights', () ->
    commands.stringy = (tl,str,n,ct) ->
      @stringed=[tl,str,n,ct]
      return 98
    commandStr = 'stringy blue 101'
    command = cp.parse(commandStr)
    # command will be
    #   (tl, ct) => commands['stringy'](tl,'blue', 101, ct)
    res = await c.run(command,tl,81)
    commands.stringed.should.deep.equal [tl,'blue',101,81]
    res.should.equal 98

  it 'shows how to handle errors in the command', () ->
    commandStr = 'invalid red'
    command = cp.parse(commandStr)
    # TODO this kind of error should come from the parse method!
    #   - invalid command name,
    #   - invalid command syntax, ...
    res = await c.run(command,tl,82)
    res.should.be.an.instanceof Error
    res.toString().should.have.string 'TypeError'
