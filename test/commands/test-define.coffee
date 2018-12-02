require '../setup-unhandled-rejection'
{StripLocation} = require './strip-location'
parser = require '../../src/commands/peg-parser'
{Analyzer} = require '../../src/commands/analyzer'
should = require('chai').should()
sinon = require 'sinon'
{def} = require '../../src/commands/define'

describe 'Command Analyzer - define', () ->

  beforeEach () ->

    # validation
    @isValidForTurn = sinon.stub().returns true
    @isValidForTurn.exp = 'a good turn'

    # commands
    @turn = sinon.stub()
    @turn.name = 'turn'
    @turn.params = [ name: 'direction', validate: @isValidForTurn ]

    # symbol table, all known commands
    @commands = { @turn, def }

    # analyzer
    stripLocation = new StripLocation
    @analyzer = new Analyzer(@commands)
    @analyze = (text) => stripLocation.process @analyzer.analyze parser.parse text
    @ctx = {}

  describe 'def', () ->

    it 'define a command', () ->
      act = @analyze 'def turn-north (turn north)'
      @analyzer.errors.should.deep.equal []
      should.not.exist act
      @isValidForTurn.calledOnceWith('north').should.be.true
      should.exist @commands['turn-north']
      # check the newly defined command
      @turn.callCount.should.equal 0
      cmd = @commands['turn-north']
      cmd @ctx
      @turn.calledOnceWith(@ctx, ['north']).should.be.true

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

    xit 'define a command with nested commands', () ->
    xit 'defined command name cannot be a number', () ->
    xit 'defined command name cannot be a variable', () ->
    xit 'define must be at the top level', () ->
    xit 'defined command validation', () ->
    xit 'defined command as a variable', () ->
