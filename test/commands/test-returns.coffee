require '../setup-unhandled-rejection'
{StripLocation} = require './strip-location'
{Parser, Analyzer, Generator, Interpreter, FlatScope} = require '../../src/commands'
should = require('chai').should()
sinon = require 'sinon'

describe 'Return values', () ->

  beforeEach () ->

    # validation
    @isNumber = (n) -> typeof n is 'number'
    @isNumber.exp = 'a number'
    @isString = (s) -> typeof s is 'string'
    @isString.exp = 'a string'

    # commands

    @sum = sinon.stub().callsFake (ctx, [...nums]) ->
      nums.reduce (num, acc) -> num + acc
    @sum.meta =
      name: 'sum'
      params: [ name: 'num', validate: @isNumber, isRest: yes ]
      returns: @isNumber

    @mul = sinon.stub().callsFake (ctx, [...nums]) ->
      nums.reduce (num, acc) -> num * acc
    @mul.meta =
      name: 'mul'
      params: [ name: 'num', validate: @isNumber, isRest: yes ]
      returns: @isNumber

    @concat = sinon.stub().callsFake (ctx, [...strs]) ->
      strs.reduce (str, acc) -> str + acc
    @concat.meta =
      name: 'concat'
      params: [ name: 'str', validate: @isString, isRest: yes ]
      returns: @isString

    # symbol table, all known commands
    @commands = { @sum, @mul, @concat }

    # analyzer
    stripLocation = new StripLocation
    parser = new Parser()
    @analyzer = new Analyzer(new FlatScope @commands)
    @analyze = (text) => stripLocation.process @analyzer.analyze parser.parse text

  describe 'command interpreter', () ->

    beforeEach () ->
      @interpreter = new Interpreter(@commands)

      @exec = (text, exp) =>
        [act] = await @interpreter.execute text
        act.should.equal exp

    it 'call commands', () ->
      @exec 'sum 4 5 6', 15
      @exec 'sum 4 (mul 5 6)', 34
      @exec 'sum 1 (sum 2 (sum 3 (sum 4 5)))', 15
      @exec 'mul 1 (sum 2 (mul 3 (sum 4 5)))', 29

    it 'define command with a return', () ->
      await @interpreter.execute 'def plus-2 (sum 2 :n)'
      @exec 'plus-2 2', 4
      @exec 'plus-2 27', 29
      @exec 'plus-2 (mul 2 5)', 12
      @exec 'mul 2 (plus-2 2)', 8
      await @interpreter.execute 'define plus-4 "+4" (plus-2 (plus-2 :n))'
      @exec 'plus-4 2', 6
      @exec 'plus-4 27', 31
      @exec 'plus-4 (mul 2 5)', 14
      @exec 'mul 2 (plus-4 2)', 12

  describe 'command generator', () ->

    beforeEach () ->
      @generator = new Generator()
      @generate = (text) => @generator.generate @analyze text
      @ctx = scope: {}

    it 'baseline - call commands with value parameters', () ->
      [cmd] = @generate 'sum 4 5 6'
      cmd(@ctx).should.deep.equal 15
      [cmd] = @generate 'mul 4 5 6'
      cmd(@ctx).should.deep.equal 120
      [cmd] = @generate 'concat "Hello" " " "World!"'
      cmd(@ctx).should.deep.equal "Hello World!"

    it 'call mul as a sum parameter', () ->
      [cmd] = @generate 'sum 4 (mul 2 3)'
      res = cmd @ctx
      @mul.calledOnceWith(@ctx, [2, 3]).should.be.true
      @sum.calledOnceWith(@ctx, [4, 6]).should.be.true
      res.should.deep.equal 10

  describe 'command analyzer', () ->

    it 'call mul as a sum parameter', () ->
      exp = [
        type: 'command', name: 'sum', value: @sum
        args: [
          { type: 'value', value: 1, param: 'num' }
          {
            type: 'command', name: 'mul', value: @mul, param: 'num'
            args: [
              { type: 'value', value: 2, param: 'num' }
              { type: 'value', value: 3, param: 'num' }
            ]
          }
        ]
        params: []
      ]
      act = @analyze 'sum 1 (mul 2 3)'
      act.should.deep.equal exp
      @analyzer.errors.should.deep.equal [] # should not issue errors

    it 'call concat as a sum parameter, should issue an error', () ->
      exp = [
        type: 'command', name: 'sum', value: @sum
        args: [
          { type: 'value', value: 1, param: 'num' }
          {
            type: 'command', name: 'concat', value: @concat, param: 'num'
            args: [
              { type: 'value', value: '2', param: 'str' }
              { type: 'value', value: '3', param: 'str' }
            ]
          }
        ]
        params: []
      ]
      act = @analyze 'sum 1 (concat "2" "3")'
      act.should.deep.equal exp
      @analyzer.errors.should.deep.equal [
        type: 'error'
        loc: '1:8-1:21'
        text: 'Bad call to "concat" for "sum" parameter 1 ("num"), must be a number'
      ]
