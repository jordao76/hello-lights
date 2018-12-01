require '../setup-unhandled-rejection'
{StripLocation} = require './strip-location'
parser = require '../../src/commands/peg-parser'
{Analyzer} = require '../../src/commands/analyzer'
_and = require('../../src/parsing/validation')['and']
should = require('chai').should()
sinon = require('sinon')

describe 'Command Analyzer', () ->

  beforeEach () ->

    # validation
    @isValidForTurn = sinon.stub().returns true
    @isValidForTurn.exp = 'a good turn'
    @isValidForMove = sinon.stub().returns true
    @isValidForMove.exp = 'a good move'
    @isValidForDo = sinon.stub().returns true
    @isValidForDo.exp = 'a good value'

    # commands
    @turn =
      name: 'turn'
      params: [ name: 'direction', validate: @isValidForTurn ]
    @move =
      name: 'move'
      params: [ name: 'how-much', validate: @isValidForMove ]
    @do =
      name: 'do'
      params: [ name: 'rest', validate: @isValidForDo, isRest: yes ]

    # symbol table, all known commands
    @commands = { @turn, @move, @do }

    # analyzer
    stripLocation = new StripLocation
    @analyzer = new Analyzer(@commands)
    @analyze = (text) => stripLocation.process @analyzer.analyze parser.parse text

  it 'call a command with an argument', () ->
    exp = [
      type: 'command'
      name: 'turn'
      value: @turn
      args: [ type: 'value', value: 'north', param: 'direction' ]
      params: []
    ]
    act = @analyze 'turn north'
    act.should.deep.equal exp
    @isValidForTurn.calledOnceWith('north').should.be.true
    @analyzer.errors.should.deep.equal []

  it 'call a command with an argument that fails validation', () ->
    @isValidForTurn.returns false
    exp = [
      type: 'command'
      name: 'turn'
      value: @turn
      args: [ type: 'value', value: 'forth', param: 'direction' ]
      params: []
    ]
    act = @analyze 'turn forth'
    act.should.deep.equal exp
    @isValidForTurn.calledOnceWith('forth').should.be.true
    @analyzer.errors.should.deep.equal [
      type: 'error'
      text: 'Bad value "forth" to "turn" parameter 1 ("direction"), must be a good turn'
      loc: '1:6-1:10'
    ]

  it 'call a command with more arguments than parameters', () ->
    exp = [
      type: 'command'
      name: 'turn'
      value: @turn
      args: [
        { type: 'value', value: 'north', param: 'direction' }
        { type: 'value', value: 'south' }
      ]
      params: []
    ]
    act = @analyze 'turn north south'
    act.should.deep.equal exp
    @isValidForTurn.calledOnceWith('north').should.be.true
    @analyzer.errors.should.deep.equal [
      type: 'error'
      text: 'Bad number of arguments to "turn": it takes 1 but was given 2'
      loc: '1:1-1:16'
    ]

  it 'call a command with less arguments than parameters', () ->
    exp = [
      type: 'command'
      name: 'turn'
      value: @turn
      args: []
      params: []
    ]
    act = @analyze 'turn'
    act.should.deep.equal exp
    @analyzer.errors.should.deep.equal [
      type: 'error'
      text: 'Bad number of arguments to "turn": it takes 1 but was given 0'
      loc: '1:1-1:4'
    ]

  it 'call a command that does not exist', () ->
    exp = [
      type: 'command', name: 'burn'
      args: [ type: 'value', value: 'north' ]
      params: []
    ]
    act = @analyze 'burn north'
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @analyzer.errors.should.deep.equal [
      type: 'error'
      text: 'Command not found: "burn"'
      loc: '1:1-1:10'
    ]

  it 'call a command that does not exist, with a valid nested command', () ->
    exp = [
      type: 'command', name: 'run'
      args: [
        type: 'command', name: 'turn', value: @turn
        args: [ type: 'value', value: 'north', param: 'direction' ]
      ]
      params: []
    ]
    act = @analyze 'run (turn north)'
    act.should.deep.equal exp
    @isValidForTurn.calledOnceWith('north').should.be.true
    @analyzer.errors.should.deep.equal [
      type: 'error'
      text: 'Command not found: "run"'
      loc: '1:1-1:16'
    ]

  it 'call a command that does not exist, with an invalid but existing nested command', () ->
    @isValidForTurn.returns false
    exp = [
      type: 'command', name: 'run'
      args: [
        type: 'command', name: 'turn', value: @turn
        args: [ type: 'value', value: 'forth', param: 'direction' ]
      ]
      params: []
    ]
    act = @analyze 'run (turn forth)'
    act.should.deep.equal exp
    @isValidForTurn.calledOnceWith('forth').should.be.true
    @analyzer.errors.should.deep.equal [
      {
        type: 'error'
        text: 'Bad value "forth" to "turn" parameter 1 ("direction"), must be a good turn'
        loc: '1:11-1:15'
      }
      {
        type: 'error'
        text: 'Command not found: "run"'
        loc: '1:1-1:16'
      }
    ]

  it 'call a command using a variable', () ->
    exp = [
      type: 'command', name: 'turn', value: @turn
      args: [ type: 'variable', name: 'where', param: 'direction' ]
      params: [ type: 'param', name: 'where', validate: @isValidForTurn ]
    ]
    act = @analyze 'turn :where'
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @analyzer.errors.should.deep.equal []

  it 'call a command with a rest param', () ->
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        { type: 'value', value: 1, param: 'rest' }
        { type: 'value', value: 2, param: 'rest' }
        { type: 'value', value: 3, param: 'rest' }
      ]
      params: []
    ]
    act = @analyze 'do 1 2 3'
    act.should.deep.equal exp
    @isValidForDo.calledWith(1).should.be.true
    @isValidForDo.calledWith(2).should.be.true
    @isValidForDo.calledWith(3).should.be.true
    @analyzer.errors.should.deep.equal []

  it 'call a command with a rest param where multiple arguments fail validation', () ->
    @isValidForDo.returns false
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        { type: 'value', value: 1, param: 'rest' }
        { type: 'value', value: 2, param: 'rest' }
      ]
      params: []
    ]
    act = @analyze 'do 1 2'
    act.should.deep.equal exp
    @isValidForDo.calledWith(1).should.be.true
    @isValidForDo.calledWith(2).should.be.true
    @isValidForDo.callCount.should.equal 2
    @analyzer.errors.should.deep.equal [
      {
        type: 'error'
        text: 'Bad value "1" to "do" parameter 1 ("rest"), must be a good value'
        loc: '1:4-1:4'
      }
      {
        type: 'error'
        text: 'Bad value "2" to "do" parameter 1 ("rest"), must be a good value'
        loc: '1:6-1:6'
      }
    ]

  it 'call a command using variables for a rest parameter', () ->
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        { type: 'variable', name: 'what', param: 'rest' }
        { type: 'variable', name: 'to-do', param: 'rest' }
      ]
      params: [
        { type: 'param', name: 'what', validate: @isValidForDo }
        { type: 'param', name: 'to-do', validate: @isValidForDo }
      ]
    ]
    act = @analyze 'do :what :to-do'
    act.should.deep.equal exp
    @isValidForDo.callCount.should.equal 0
    @analyzer.errors.should.deep.equal []

  it 'call nested commands with variables', () ->
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        type: 'command', name: 'turn', value: @turn, param: 'rest'
        args: [ type: 'variable', name: 'where', param: 'direction' ]
      ]
      params: [ type: 'param', name: 'where', validate: @isValidForTurn ]
    ]
    act = @analyze 'do (turn :where)'
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @isValidForDo.calledOnceWith(@turn).should.be.true
    @analyzer.errors.should.deep.equal []

  it 'call nested commands with distinct variables', () ->
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        {
          type: 'command', name: 'turn', value: @turn, param: 'rest'
          args: [ type: 'variable', name: 'where', param: 'direction' ]
        }
        {
          type: 'command', name: 'move', value: @move, param: 'rest'
          args: [ type: 'variable', name: 'amount', param: 'how-much' ]
        }
      ]
      params: [
        { type: 'param', name: 'where', validate: @isValidForTurn }
        { type: 'param', name: 'amount', validate: @isValidForMove }
      ]
    ]
    act = @analyze 'do (turn :where) (move :amount)'
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @isValidForMove.callCount.should.equal 0
    @isValidForDo.calledWith(@turn).should.be.true
    @isValidForDo.calledWith(@move).should.be.true
    @isValidForDo.callCount.should.equal 2
    @analyzer.errors.should.deep.equal []

  it 'call nested commands with repeated variables', () ->
    exp = [
      type: 'command', name: 'do', value: @do
      args: [
        {
          type: 'command', name: 'turn', value: @turn, param: 'rest'
          args: [ type: 'variable', name: 'where', param: 'direction' ]
        }
        {
          type: 'command', name: 'move', value: @move, param: 'rest'
          args: [ type: 'variable', name: 'where', param: 'how-much' ]
        }
      ]
    ]
    act = @analyze 'do (turn :where) (move :where)'
    params = act[0].params # save params for later
    delete act[0].params # don't compare with params
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @isValidForMove.callCount.should.equal 0
    @isValidForDo.calledWith(@turn).should.be.true
    @isValidForDo.calledWith(@move).should.be.true
    @isValidForDo.callCount.should.equal 2
    @analyzer.errors.should.deep.equal []
    # validations are combined in the shared param "where"
    params.length.should.equal 1
    params[0].name.should.equal 'where'
    params[0].validate('test').should.be.true # trigger validation
    @isValidForTurn.callCount.should.equal 1
    @isValidForMove.callCount.should.equal 1
    @isValidForTurn.calledWith('test').should.be.true
    @isValidForMove.calledWith('test').should.be.true

  it 'call multiple commands with repeated variable names, which should belong to different scopes', () ->
    exp = [
      {
        type: 'command', name: 'turn', value: @turn
        args: [ type: 'variable', name: 'where', param: 'direction' ]
        params: [ type: 'param', name: 'where', validate: @isValidForTurn ]
      }
      {
        type: 'command', name: 'move', value: @move
        args: [ type: 'variable', name: 'where', param: 'how-much' ]
        params: [ type: 'param', name: 'where', validate: @isValidForMove ]
      }
    ]
    act = @analyze '(turn :where) (move :where)'
    act.should.deep.equal exp
    @isValidForTurn.callCount.should.equal 0
    @isValidForMove.callCount.should.equal 0
    @analyzer.errors.should.deep.equal []

  it 'null "nodes", when a syntax error occurs in the underlying parser', () ->
    act = @analyzer.analyze null
    should.not.exist act

  describe 'def', () ->

    xit 'define a command', () ->
      @commands.def = # TODO: intrinsic to the analyser
        name: 'def'
        isMacro: yes # TODO?
        params: [
          { type: 'param', name: 'name', validate: () -> yes }
          { type: 'param', name: 'command', validate: () -> yes }
        ]
      exp = [ # TODO: desired structure?
        type: 'define', name: 'turn-north'
        params: []
        value: [
          type: 'command', name: 'turn', value: @turn
          args: [ type: 'value', value: 'north', param: 'direction' ]
        ]
      ]
      exp = [
        type: 'command', name: 'def'
        params: []
        value: @commands.def
        args: [
          { type: 'value', value: 'turn-north', param: 'name' }
          {
            type: 'command', name: 'turn', value: @turn, param: 'command'
            args: [ type: 'value', value: 'north', param: 'direction' ]
          }
        ]
      ]
      act = @analyze 'def turn-north (turn north)'
      act.should.deep.equal exp
      @isValidForTurn.calledOnceWith('north').should.be.true
      # TODO @commands['turn-north'].should.equal exp[0]
      @analyzer.errors.should.deep.equal []

    xit 'define a command with a parameter', () ->
      exp = [
        type: 'define', name: 'turn-2'
        params: [ type: 'param', name: 'where', validate: @isValidForTurn ]
        value: [
          type: 'command', name: 'turn', value: @turn
          args: [ type: 'variable', name: 'where', param: 'direction' ]
        ]
      ]
      act = @analyze 'def turn-2 (turn :where)'
      act.should.deep.equal exp
      @isValidForTurn.callCount.should.equal 0
      @commands['turn-2'].should.equal exp[0]
      @analyzer.errors.should.deep.equal []

    xit 'defined command name cannot be a number', () ->
    xit 'defined command name cannot be a variable', () ->
    xit 'define must be at the top level', () ->
    xit 'defined command validation', () ->
    xit 'defined command as a variable', () ->
