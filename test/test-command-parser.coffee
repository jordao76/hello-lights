{CommandParser} = require '../src/command-parser'
{Cancellable} = require '../src/cancellable'
require('chai').should()
sinon = require('sinon')

describe 'CommandParser', () ->

  beforeEach () =>
    @commands = {}
    @cp = new CommandParser(@commands)
    @tl = red:32, yellow:33, green:34
    @ct = new Cancellable
    @scope = {}

  it 'should parse a parameterless command', () =>
    @commands.cycle = sinon.stub().returns 96
    @commands.cycle.paramNames = []
    commandStr = 'cycle'
    command = @cp.parse(commandStr)
    # command will be
    #   ({tl, ct, scope={}}) => @commands['cycle']({tl, ct, scope})
    res = await command({@tl, @ct})
    sinon.assert.calledWith(@commands.cycle, {@tl, @ct, @scope})
    res.should.equal 96

  it 'should parse a command with parameters', () =>
    @commands.blink = sinon.stub().returns 95
    @commands.blink.paramNames = ['light','ms','times']
    commandStr = 'blink red 500 10'
    command = @cp.parse(commandStr)
    # command will be
    #   ({tl, ct, scope={}}) => @commands['blink']({tl, ct, scope}, ['red', 500, 10])
    res = await command({@tl, @ct})
    sinon.assert.calledWith(@commands.blink, {@tl, @ct, @scope}, ['red', 500, 10])
    res.should.equal 95

  it 'should parse a sub-command', () =>
    @commands.repeat = (ctx, [n, c]) -> c(ctx)
    @commands.repeat.paramNames = ['n','c']
    @commands.toggle = sinon.stub().returns 97
    @commands.toggle.paramNames = ['light']
    commandStr = 'repeat 100 (toggle green)'
    command = @cp.parse(commandStr)
    res = await command({@tl, @ct})
    sinon.assert.calledWith @commands.toggle, {@tl, @ct, @scope}, ['green']
    res.should.equal 97

  it 'should pass the parser to a command that needs it', () =>
    @commands.needsParser = sinon.stub().returns 95
    @commands.needsParser.paramNames = []
    @commands.needsParser.usesParser = true
    commandStr = 'needsParser'
    command = @cp.parse(commandStr)
    res = await command({@tl, @ct})
    sinon.assert.calledWith @commands.needsParser, {@cp, @tl, @ct, @scope}
    res.should.equal 95

  it 'should throw an error for an invalid command name', () =>
    commandStr = 'invalid red'
    parse = () => @cp.parse(commandStr)
    parse.should.throw 'Command not found: "invalid"'

  describe 'transformation', () =>

    it 'should call a transformation', () =>
      @commands.sum = ({tl, ct}, [a]) -> a
      @commands.sum.paramNames = ['a']
      @commands.sum.transformation = (args) -> [args.reduce((a, b) -> a + b)]
      commandStr = 'sum 1 2 3 4'
      command = @cp.parse(commandStr)
      res = await command({@tl, @ct})
      res.should.equal 10

    it 'use a transformation for a rest parameter', () =>
      isValid = () -> yes
      splitter = (n) -> (a) -> [...a.slice(0, n), a.slice(n)]
      @commands.takesRest = sinon.stub().returns 94
      @commands.takesRest.paramNames = ['p1','p2','rest']
      @commands.takesRest.transformation = splitter 2
      # 1 and 2 are the first params, 3 and 4 are the rest
      commandStr = 'takesRest 1 2 3 4'
      command = @cp.parse(commandStr)
      res = await command({@tl, @ct})
      sinon.assert.calledWith(@commands.takesRest, {@tl, @ct, @scope}, [1, 2, [3, 4]])
      res.should.equal 94

  describe 'validation', () =>

    beforeEach () =>
      @commands.run = (ctx, [c1, c2]) -> c1(ctx); c2(ctx);
      @commands.run.title = 'run'
      @commands.run.paramNames = ['c1','c2']
      @isValid = sinon.stub()
      @isValid.exp = '"red", "yellow" or "green"' # validation function's expectations
      @commands.turnOn = sinon.stub()
      @commands.turnOn.name = 'turnOn' # changing the "name" of a stub silently fails
      @commands.turnOn.name.should.equal 'proxy' # "proxy" is the "name" given by sinon
      @commands.turnOn.title = 'turnOn' # so "title" is used as an alternative (taking precedence over "name")
      @commands.turnOn.paramNames = ['light'] # parameters names to turnOn
      @commands.turnOn.validation = [@isValid] # validations to turnOn, matching the paramNames

    it 'should validate a parameter', () =>
      @isValid.returns yes
      commandStr = 'turnOn red'
      command = @cp.parse(commandStr)
      @isValid.calledOnceWith('red').should.be.true
      await command({@tl, @ct})
      sinon.assert.calledWith(@commands.turnOn, {@tl, @ct, @scope}, ['red'])

    it 'should throw a validation error for an invalid argument', () =>
      @isValid.returns no
      parse = () => @cp.parse('turnOn blue')
      msg = 'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      parse.should.throw msg

    it 'should throw a validation error for a missing parameter (bad arity)', () =>
      @isValid.returns yes
      commandStr = 'turnOn'
      parse = () => @cp.parse(commandStr)
      parse.should.throw 'Bad number of arguments to "turnOn"; it takes 1 but was given 0'

    it 'should throw a validation error for an extra parameter', () =>
      @isValid.returns yes
      commandStr = 'turnOn red 1'
      parse = () => @cp.parse(commandStr)
      parse.should.throw 'Bad number of arguments to "turnOn"; it takes 1 but was given 2'

    it 'should validate the 1st argument even when more arguments are provided', () =>
      @isValid.returns no
      commandStr = 'turnOn blue 1'
      parse = () => @cp.parse(commandStr)
      msg = [
        'Bad number of arguments to "turnOn"; it takes 1 but was given 2',
        'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      parse.should.throw msg

    it 'should validate nested commands with 2 bad arguments', () =>
      @isValid.returns no
      parse = () => @cp.parse('run (turnOn blue) (turnOn cyan)')
      msg = [
        'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"',
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      parse.should.throw msg

    it 'should validate nested commands with 1 bad arity and 1 bad argument', () =>
      @isValid.returns no
      parse = () => @cp.parse('run (turnOn) (turnOn cyan)')
      msg = [
        'Bad number of arguments to "turnOn"; it takes 1 but was given 0',
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      parse.should.throw msg

    it 'should validate nested commands with 1 bad argument and 1 bad command', () =>
      @isValid.returns no
      parse = () => @cp.parse('run (turnOn cyan) (turnBlue)')
      msg = [
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"',
        'Command not found: "turnBlue"'
      ].join '\n'
      parse.should.throw msg

    it 'validation is deferred for variables', () =>
      @isValid.returns yes
      commandStr = 'turnOn :light'
      command = @cp.parse(commandStr)
      @isValid.notCalled.should.be.true # validation is deferred
      @scope = light: 'red'
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.turnOn, {@tl, @ct, @scope}, ['red'])
      sinon.assert.calledOnce(@isValid)
      sinon.assert.calledWith(@isValid, 'red')

    it 'should throw a validation error when validating a bound variable', () =>
      @isValid.returns no
      commandStr = 'turnOn :light'
      command = @cp.parse(commandStr)
      @isValid.notCalled.should.be.true # validation is deferred
      @scope = light: 'cyan'
      exec = () => command({@tl, @ct, @scope})
      msg = 'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      exec.should.throw msg

  describe 'variables', () =>

    it 'should parse a command with a variable', () =>
      @commands.pause = sinon.stub().returns 42
      @commands.pause.paramNames = ['ms']
      commandStr = 'pause :ms'
      command = @cp.parse(commandStr)
      @scope = ms: 33
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.pause, {@tl, @ct, @scope}, [33])
      res.should.equal 42

    it 'should parse a command with a variable and a value', () =>
      @commands.my_command = sinon.stub()
      @commands.my_command.paramNames = ['ms','v']
      command = @cp.parse('my_command :ms 7')
      @scope = ms: 3
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.my_command, {@tl, @ct, @scope}, [3, 7])

    it 'should parse a command with two variables', () =>
      @commands.my_command = sinon.stub()
      @commands.my_command.paramNames = ['v1','v2']
      command = @cp.parse('my_command :v1 :v2')
      @scope = v2: 3, v1: 4
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.my_command, {@tl, @ct, @scope}, [4, 3])

    it 'should parse a command with a nested command with a variable', () =>
      @commands.run = ({tl, ct, scope}, [command]) -> command({tl, ct, scope})
      @commands.run.paramNames = ['command']
      @commands.toggle = sinon.stub()
      @commands.toggle.paramNames = ['light']
      command = @cp.parse('run (toggle :light)')
      @scope = light: 'red'
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.toggle, {@tl, @ct, @scope}, ['red'])

    it 'should parse a command with nested commands with variables', () =>
      @commands.run = ({tl, ct, scope}, [cs]) -> c({tl, ct, scope}) for c in cs
      @commands.run.paramNames = ['cs']
      @commands.run.transformation = (args) -> [args] # rest parameter
      @commands.toggle = sinon.stub()
      @commands.toggle.paramNames = ['light']
      @commands.pause = sinon.stub()
      @commands.pause.paramNames = ['ms']
      command = @cp.parse('run (toggle :light) (pause :ms) (toggle :light)')
      @scope = light: 'red', ms: 150
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.pause, {@tl, @ct, @scope}, [150])
      sinon.assert.calledWith(@commands.toggle, {@tl, @ct, @scope}, ['red'])
      sinon.assert.calledTwice(@commands.toggle)

  describe 'define', () =>

    it 'should define a new command', () =>
      @commands.stub = sinon.stub()
      @commands.stub.paramNames = ['v']
      @cp.define('fake', @cp.parse('stub 42')) # fake calls stub
      command = @cp.parse('fake')
      res = await command({@tl, @ct})
      sinon.assert.calledWith(@commands.stub, {@tl, @ct, @scope}, [42])

    it 'should define a new command with a variable', () =>
      @commands.stub = sinon.stub()
      @commands.stub.paramNames = ['v']
      fake = @cp.define('fake', @cp.parse('stub :var'))
      # check metadata
      fake.title.should.equal 'fake'
      fake.paramNames.should.deep.equal ['var']
      # execute
      command = @cp.parse('fake 42')
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.stub, {@tl, @ct, @scope}, [42])

    it 'should define a new command with validation', () =>
      isRed = (c) -> c is 'red'
      isNumber = (n) -> typeof n is 'number'
      @commands.twinkle = sinon.stub()
      @commands.twinkle.paramNames = ['color', 'n']
      @commands.twinkle.validation = [isRed, isNumber]
      burst = @cp.define('burst', @cp.parse('twinkle :light 50'))
      # check metadata
      burst.title.should.equal 'burst'
      burst.paramNames.should.deep.equal ['light']
      #TODO burst.validation.should.deep.equal [isRed]
      # execute
      command = @cp.parse('burst red')
      res = await command({@tl, @ct, @scope})
      sinon.assert.calledWith(@commands.twinkle, {@tl, @ct, @scope}, ['red', 50])
