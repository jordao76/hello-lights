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
    @exec = (commandStr) => @cp.execute(commandStr, @tl, @ct, @scope)

  it 'should execute a parameterless command', () =>
    @commands.cycle = sinon.stub().returns 96
    @commands.cycle.paramNames = []
    res = await @exec('cycle')
    sinon.assert.calledWith(@commands.cycle, {@tl, @ct, @scope})
    res.should.equal 96

  it 'should execute multiple commands', () =>
    @commands.cycle = sinon.stub().returns 96
    @commands.cycle.paramNames = []
    commandStr = '(cycle) (cycle)' # twice
    res = await @exec(commandStr)
    sinon.assert.calledTwice(@commands.cycle)
    sinon.assert.calledWith(@commands.cycle, {@tl, @ct, @scope})
    res.should.equal 96

  it 'should execute a command with parameters', () =>
    @commands.blink = sinon.stub().returns 95
    @commands.blink.paramNames = ['light','ms','times']
    res = await @exec('blink red 500 10')
    sinon.assert.calledWith(@commands.blink, {@tl, @ct, @scope}, ['red', 500, 10])
    res.should.equal 95

  it 'should execute a sub-command', () =>
    @commands.repeat = (ctx, [n, c]) -> c(ctx)
    @commands.repeat.paramNames = ['n','c']
    @commands.toggle = sinon.stub().returns 97
    @commands.toggle.paramNames = ['light']
    res = await @exec('repeat 100 (toggle green)')
    sinon.assert.calledWith @commands.toggle, {@tl, @ct, @scope}, ['green']
    res.should.equal 97

  it 'should throw an error for an invalid command name', () =>
    @exec('invalid red').catch (e) =>
      e.message.should.equal 'Command not found: "invalid"'

  describe 'transformation', () =>

    it 'should call a transformation', () =>
      @commands.sum = ({tl, ct}, [a]) -> a
      @commands.sum.paramNames = ['a']
      @commands.sum.transformation = (args) -> [args.reduce((a, b) -> a + b)]
      res = await @exec('sum 1 2 3 4')
      res.should.equal 10

    it 'use a transformation for a rest parameter', () =>
      isValid = () -> yes
      splitter = (n) -> (a) -> [...a.slice(0, n), a.slice(n)]
      @commands.takesRest = sinon.stub().returns 94
      @commands.takesRest.paramNames = ['p1','p2','rest']
      @commands.takesRest.transformation = splitter 2
      # 1 and 2 are the first params, 3 and 4 are the rest
      res = await @exec('takesRest 1 2 3 4')
      sinon.assert.calledWith(@commands.takesRest, {@tl, @ct, @scope}, [1, 2, [3, 4]])
      res.should.equal 94

  describe 'validation', () =>

    beforeEach () =>
      @commands.run = (ctx, [c1, c2]) -> c1(ctx); c2(ctx);
      @commands.run.doc = name: 'run'
      @commands.run.paramNames = ['c1','c2']
      @isValid = sinon.stub()
      @isValid.exp = '"red", "yellow" or "green"' # validation function's expectations
      @commands.turnOn = sinon.stub()
      @commands.turnOn.doc = name: 'turnOn'
      @commands.turnOn.paramNames = ['light'] # parameters names to turnOn
      @commands.turnOn.validation = [@isValid] # validations to turnOn, matching the paramNames

    it 'should validate a parameter', () =>
      @isValid.returns yes
      await @exec('turnOn red')
      sinon.assert.calledWith(@isValid, 'red')
      sinon.assert.calledWith(@commands.turnOn, {@tl, @ct, @scope}, ['red'])

    it 'should throw a validation error for an invalid argument', () =>
      @isValid.returns no
      @exec('turnOn blue').catch (e) =>
        e.message.should.equal 'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'

    it 'should throw a validation error for a missing parameter (bad arity)', () =>
      @isValid.returns yes
      @exec('turnOn').catch (e) =>
        e.message.should.equal 'Bad number of arguments to "turnOn"; it takes 1 but was given 0'

    it 'should throw a validation error for an extra parameter', () =>
      @isValid.returns yes
      @exec('turnOn red 1').catch (e) =>
        e.message.should.equal 'Bad number of arguments to "turnOn"; it takes 1 but was given 2'

    it 'should validate the 1st argument even when more arguments are provided', () =>
      @isValid.returns no
      msg = [
        'Bad number of arguments to "turnOn"; it takes 1 but was given 2',
        'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      @exec('turnOn blue 1').catch (e) =>
        e.message.should.equal msg

    it 'should validate nested commands with 2 bad arguments', () =>
      @isValid.returns no
      msg = [
        'Bad value "blue" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"',
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      @exec('run (turnOn blue) (turnOn cyan)').catch (e) =>
        e.message.should.equal msg

    it 'should validate nested commands with 1 bad arity and 1 bad argument', () =>
      @isValid.returns no
      msg = [
        'Bad number of arguments to "turnOn"; it takes 1 but was given 0',
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      ].join '\n'
      @exec('run (turnOn) (turnOn cyan)').catch (e) =>
        e.message.should.equal msg

    it 'should validate nested commands with 1 bad argument and 1 bad command', () =>
      @isValid.returns no
      msg = [
        'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"',
        'Command not found: "turnBlue"'
      ].join '\n'
      @exec('run (turnOn cyan) (turnBlue)').catch (e) =>
        e.message.should.equal msg

    it 'validation should work for variables', () =>
      @isValid.returns yes
      @scope = light: 'red'
      res = await @exec('turnOn :light')
      sinon.assert.calledWith(@commands.turnOn, {@tl, @ct, @scope}, ['red'])
      sinon.assert.calledOnce(@isValid)
      sinon.assert.calledWith(@isValid, 'red')

    it 'should throw a validation error when validating a bound variable', () =>
      @isValid.returns no
      @scope = light: 'cyan'
      msg = 'Bad value "cyan" to "turnOn" parameter 1 ("light"); must be: "red", "yellow" or "green"'
      @exec('turnOn :light').catch (e) =>
        e.message.should.equal msg

  describe 'variables', () =>

    it 'should execute a command with a variable', () =>
      @commands.pause = sinon.stub().returns 42
      @commands.pause.paramNames = ['ms']
      @scope = ms: 33
      res = await @exec('pause :ms')
      sinon.assert.calledWith(@commands.pause, {@tl, @ct, @scope}, [33])
      res.should.equal 42

    it 'should execute a command with a variable and a value', () =>
      @commands.my_command = sinon.stub()
      @commands.my_command.paramNames = ['ms','v']
      @scope = ms: 3
      res = await @exec('my_command :ms 7')
      sinon.assert.calledWith(@commands.my_command, {@tl, @ct, @scope}, [3, 7])

    it 'should execute a command with two variables', () =>
      @commands.my_command = sinon.stub()
      @commands.my_command.paramNames = ['v1','v2']
      @scope = v2: 3, v1: 4
      res = @exec('my_command :v1 :v2')
      sinon.assert.calledWith(@commands.my_command, {@tl, @ct, @scope}, [4, 3])

    it 'should execute a command with a nested command with a variable', () =>
      @commands.run = ({tl, ct, scope}, [command]) -> command({tl, ct, scope})
      @commands.run.paramNames = ['command']
      @commands.toggle = sinon.stub()
      @commands.toggle.paramNames = ['light']
      @scope = light: 'red'
      res = await @exec("""; test parsing comments as well
        ; a comment till the end of the line
        run ; comments
          (toggle
            ; more comments
            :light
            ; and more comments
          )
          ; still more
          ; comments
      """)
      sinon.assert.calledWith(@commands.toggle, {@tl, @ct, @scope}, ['red'])

    it 'should execute a command with nested commands with variables', () =>
      @commands.run = ({tl, ct, scope}, [cs]) -> c({tl, ct, scope}) for c in cs
      @commands.run.paramNames = ['cs']
      @commands.run.transformation = (args) -> [args] # rest parameter
      @commands.toggle = sinon.stub()
      @commands.toggle.paramNames = ['light']
      @commands.pause = sinon.stub()
      @commands.pause.paramNames = ['ms']
      @scope = light: 'red', ms: 150
      res = await @exec('run (toggle :light) (pause :ms) (toggle :light)')
      sinon.assert.calledWith(@commands.pause, {@tl, @ct, @scope}, [150])
      sinon.assert.calledWith(@commands.toggle, {@tl, @ct, @scope}, ['red'])
      sinon.assert.calledTwice(@commands.toggle)

  describe 'define', () =>

    it 'should define a new command', () =>
      @commands.stub = sinon.stub()
      @commands.stub.paramNames = ['v']
      @cp.define('fake', @cp.parse('stub 42')) # fake calls stub
      res = await @exec('fake')
      sinon.assert.calledWith(@commands.stub, {@tl, @ct, @scope}, [42])

    it 'should define a new command with a variable', () =>
      @commands.stub = sinon.stub()
      @commands.stub.paramNames = ['v']
      fake = @cp.define('fake', @cp.parse('stub :var'))
      # check metadata
      fake.doc.name.should.equal 'fake'
      fake.paramNames.should.deep.equal ['var']
      # execute
      res = await @exec('fake 42')
      sinon.assert.calledWith(@commands.stub, {@tl, @ct, @scope}, [42])

    it 'should define a new command with validation', () =>
      isRed = (c) -> c is 'red'
      isNumber = (n) -> typeof n is 'number'
      @commands.twinkle = sinon.stub()
      @commands.twinkle.paramNames = ['color', 'n']
      @commands.twinkle.validation = [isRed, isNumber]
      burst = @cp.define('burst', @cp.parse('twinkle :light 50'))
      # check metadata
      burst.doc.name.should.equal 'burst'
      burst.paramNames.should.deep.equal ['light']
      #TODO burst.validation.should.deep.equal [isRed]
      # execute
      res = await @exec('burst red')
      sinon.assert.calledWith(@commands.twinkle, {@tl, @ct, @scope}, ['red', 50])
