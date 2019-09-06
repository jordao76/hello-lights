require '../setup-unhandled-rejection'
{FlatScope} = require '../../src/commands'
chai = require 'chai'
should = chai.should()

describe 'FlatScope', () ->

  describe 'start off empty', () ->

    beforeEach () ->
      @scope = new FlatScope

    it 'should have no commands', () ->
      @scope.commandNames.length.should.equal 0

    it 'should add a command', () ->
      should.not.exist @scope.lookup('move')
      @scope.add 'move', 'move command'
      @scope.lookup('move').should.equal 'move command'

  describe 'start off with commands', () ->

    beforeEach () ->
      @commands =
        move: 'move command'
        turn: 'turn command'
      @scope = new FlatScope @commands

    it 'should have two commands', () ->
      @scope.commandNames.length.should.equal 2
      @scope.commandNames.should.deep.equal ['move', 'turn']

    it 'lookup should find a command', () ->
      @scope.lookup('move').should.equal 'move command'

    it 'lookup should return null for a non-existent command', () ->
      should.not.exist @scope.lookup('dummy')

    it 'add should overwrite an existing command', () ->
      @scope.add 'move', 'another move command'
      @scope.lookup('move').should.equal 'another move command'
