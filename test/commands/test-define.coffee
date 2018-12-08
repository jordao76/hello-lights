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
    @turn = sinon.stub().returns 42
    @turn.name = 'turn'
    @turn.params = [ name: 'direction', validate: @isValidForTurn ]
    @do = (ctx, commands) -> command(ctx) for command in commands
    @do.name = 'do'
    @do.params = [
      name: 'commands'
      validate: (c) -> typeof c is 'function'
      isRest: yes
    ]

    # symbol table, all known commands
    @commands = { @turn, @do, def }

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
      cmd.params.length.should.equal 0
      cmd.params.should.deep.equal []
      res = cmd @ctx
      @turn.callCount.should.equal 1
      turnCall = @turn.getCall(0)
      turnCall.args[0].should.deep.equal scope: {}
      turnCall.args[1].should.deep.equal ['north']
      res.should.equal 42

    it 'define a command with a parameter', () ->
      act = @analyze 'def turn-2 (turn :where)'
      @analyzer.errors.should.deep.equal []
      should.not.exist act
      @isValidForTurn.callCount.should.equal 0
      should.exist @commands['turn-2']
      # check the newly defined command, call it directly
      @turn.callCount.should.equal 0
      cmd = @commands['turn-2']
      cmd.params.length.should.equal 1
      cmd.params.should.deep.equal [
        type: 'param', name: 'where', validate: @isValidForTurn
        uses: ['1:18-1:23']
      ]
      res = cmd @ctx, ['south']
      @isValidForTurn.callCount.should.equal 0 # validation only happens when calling "within the language"
      @turn.callCount.should.equal 1
      turnCall = @turn.getCall(0)
      turnCall.args[0].should.deep.equal scope: { where: 'south' }
      turnCall.args[1].should.deep.equal ['south']
      res.should.equal 42
      # check the newly defined command, call it through the language
      act = @analyze 'turn-2 east'
      @isValidForTurn.callCount.should.equal 1 # validation should happen now
      act.should.deep.equal [
        type: 'command', name: 'turn-2', params: [], value: cmd
        args: [ type: 'value', value: 'east', param: 'where' ]
      ]

    it 'define a command with nested commands', () ->
      act = @analyze 'def turn-m (do (turn north) (turn south))'
      @analyzer.errors.should.deep.equal []
      should.not.exist act
      @isValidForTurn.callCount.should.equal 2
      @isValidForTurn.calledWith('north').should.be.true
      @isValidForTurn.calledWith('south').should.be.true
      should.exist @commands['turn-m']
      # check the newly defined command, call it directly
      @turn.callCount.should.equal 0
      cmd = @commands['turn-m']
      cmd.params.length.should.equal 0
      cmd @ctx
      @isValidForTurn.callCount.should.equal 2 # validation already happened on definition
      @turn.callCount.should.equal 2
      expCtx = scope: {}
      @turn.calledWith(expCtx, ['north']).should.be.true
      @turn.calledWith(expCtx, ['south']).should.be.true

    it 'define a command with nested commands with parameters', () ->
      act = @analyze 'def turn-m (do (turn :first) (turn :second))'
      @analyzer.errors.should.deep.equal []
      should.not.exist act
      @isValidForTurn.callCount.should.equal 0
      should.exist @commands['turn-m']
      # check the newly defined command, call it directly
      @turn.callCount.should.equal 0
      cmd = @commands['turn-m']
      cmd.params.length.should.equal 2
      cmd @ctx, ['north', 'south']
      @isValidForTurn.callCount.should.equal 0 # validation only happens "in the language"
      @turn.callCount.should.equal 2
      expCtx = scope: { first: 'north', second: 'south' }
      @turn.calledWith(expCtx, ['north']).should.be.true
      @turn.calledWith(expCtx, ['south']).should.be.true
      # check the newly defined command, call it through the language
      act = @analyze 'turn-m east west'
      @isValidForTurn.callCount.should.equal 2
      @isValidForTurn.calledWith('east').should.be.true
      @isValidForTurn.calledWith('west').should.be.true
      act.should.deep.equal [
        type: 'command', name: 'turn-m', params: [], value: cmd
        args: [
          { type: 'value', value: 'east', param: 'first' }
          { type: 'value', value: 'west', param: 'second' }
        ]
      ]

    it 'defined command name must not be a number', () ->
      act = @analyze 'def 42 (turn north)'
      @analyzer.errors.should.deep.equal [
        type: 'error'
        text: 'Bad value "42" to "def" parameter 1 ("name"), must be a valid identifier'
        loc: '1:5-1:6'
      ]

    it 'defined command name must not be a variable', () ->
      act = @analyze 'def :name (turn north)'
      @analyzer.errors.should.deep.equal [
        type: 'error'
        text: 'Bad value ":name" to "def" parameter 1 ("name"), must be a valid identifier'
        loc: '1:5-1:9'
      ]

    it 'define must be at the top level', () ->
      act = @analyze 'do (def turn-2 (turn north))'
      @analyzer.errors.should.deep.equal [
        type: 'error'
        text: '"def" cannot be nested'
        loc: '1:5-1:27'
      ]

    it 'define must be at the top level and must not be a variable', () ->
      act = @analyze 'do (def :var (turn north))'
      @analyzer.errors.should.deep.equal [
        { type: 'error', text: 'Bad value ":var" to "def" parameter 1 ("name"), must be a valid identifier', loc: '1:9-1:12' }
        { type: 'error', text: '"def" cannot be nested', loc: '1:5-1:25' }
      ]

    it 'cannot redefine def', () ->
      act = @analyze 'def def (turn north)'
      @analyzer.errors.should.deep.equal [
        type: 'error', text: '"def" cannot be redefined', loc: '1:1-1:20'
      ]

    it 'defined command as a variable', () ->
      act = @analyze 'def generic :cmd'
      @analyzer.errors.should.deep.equal []
      should.not.exist act
      should.exist @commands['generic']
      # check the newly defined command
      act = @analyze 'generic (turn north)'
      @isValidForTurn.calledOnceWith('north').should.be.true
      act.should.deep.equal [
        type: 'command', name: 'generic', params: [], value: @commands['generic']
        args: [
          type: 'command', name: 'turn', param: 'cmd', value: @turn
          args: [
            type: 'value', value: 'north', param: 'direction'
          ]
        ]
      ]
