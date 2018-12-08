require '../setup-unhandled-rejection'
{StripLocation} = require './strip-location'
{Parser, Analyzer} = require '../../src/commands'
should = require('chai').should()
sinon = require 'sinon'

describe 'Command Analyzer', () ->

  beforeEach () ->

    # validation
    @isValidForTurn = sinon.stub().returns true
    @isValidForTurn.exp = 'a good turn'
    @isValidForMove = sinon.stub().returns true
    @isValidForMove.exp = 'a good move'
    @isValidForDo = sinon.stub().returns true
    @isValidForDo.exp = 'a good value'
    @isValidP1 = sinon.stub().returns true
    @isValidP1.exp = 'a good P1'
    @isValidP2 = sinon.stub().returns true
    @isValidP2.exp = 'a good P2'
    @isValidP3 = sinon.stub().returns true
    @isValidP3.exp = 'a good P3'

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
    @mixed = # mixed validation
      name: 'mixed'
      params: [
        { name: 'p1', validate: @isValidP1 }
        { name: 'p2', validate: @isValidP2 }
        { name: 'p3', validate: @isValidP3, isRest: yes }
      ]

    # symbol table, all known commands
    @commands = { @turn, @move, @do, @mixed }

    # analyzer
    stripLocation = new StripLocation
    parser = new Parser()
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

  it 'validates multiple arguments', () ->
    @analyze 'mixed "some value" 42 asdf 43'
    @analyzer.errors.should.deep.equal []
    @isValidP1.calledOnceWith('some value').should.be.true
    @isValidP2.calledOnceWith(42).should.be.true
    @isValidP3.callCount.should.equal 2
    @isValidP3.calledWith('asdf').should.be.true
    @isValidP3.calledWith(43).should.be.true

  it 'validates multiple arguments with errors', () ->
    @isValidP2.returns false
    @isValidP3.withArgs(43).returns false
    @analyze 'mixed "some value" 42 asdf 43'
    @analyzer.errors.should.deep.equal [
      { loc: '1:20-1:21', text: 'Bad value "42" to "mixed" parameter 2 ("p2"), must be a good P2', type: 'error' }
      { loc: '1:28-1:29', text: 'Bad value "43" to "mixed" parameter 3 ("p3"), must be a good P3', type: 'error' }
    ]

  describe 'macros', () ->

    beforeEach () ->
      @macro = sinon.stub()
      @macro.name = 'macro'
      @macro.isMacro = yes
      @macro.params = []
      @commands.macro = @macro

    it 'should be passed the context of the parse tree: node, root node and commands', () ->
      @macro.returns null # removes itself from the tree
      act = @analyze 'macro'
      should.not.exist act # nothing left on the tree
      @macro.callCount.should.equal 1
      macroArg = @macro.getCall(0).args[0]
      macroArg.commands.should.deep.equal @commands
      macroArg.root.type.should.equal 'command'
      macroArg.root.name.should.equal 'macro'
      macroArg.node.type.should.equal 'command'
      macroArg.node.name.should.equal 'macro'

    it 'its return node gets added to the tree in its place', () ->
      @macro.returns { type: 'value', name: 'anything' }
      act = @analyze 'do (macro)'
      act.should.deep.equal [
        type: 'command', name: 'do', value: @do, params: []
        args: [ type: 'value', name: 'anything', param: 'rest' ]
      ]

    it 'removes itself as a nested node', () ->
      @macro.returns null # removes itself
      act = @analyze 'do (macro)'
      act.should.deep.equal [
        type: 'command', name: 'do', value: @do, params: []
        args: [] # removed from here
      ]

    it 'returns an error to the analyzer', () ->
      @macro.returns { type: 'error', text: 'Error message', loc: '1:5-1:9' }
      act = @analyze 'macro'
      @analyzer.errors.should.deep.equal [
        type: 'error', text: 'Error message', loc: '1:5-1:9'
      ]

    it 'returns multiple errors to the analyzer', () ->
      @macro.returns [
        { type: 'error', text: 'Error message', loc: '1:5-1:9' }
        { type: 'error', text: 'Another error message', loc: '1:5-1:9' }
      ]
      act = @analyze 'macro'
      @analyzer.errors.should.deep.equal [
        { type: 'error', text: 'Error message', loc: '1:5-1:9' }
        { type: 'error', text: 'Another error message', loc: '1:5-1:9' }
      ]
