require '../setup-unhandled-rejection'
{StripLocation} = require './strip-location'
{Parser, Analyzer, FlatScope} = require '../../src/commands'
should = require('chai').should()
path = require 'path'
sinon = require 'sinon'
$import = require('../../src/commands/import').import
{isString} = require '../../src/commands/validation'

describe 'Command Analyzer - import', () ->

  beforeEach () ->

    @isValidForTurn = sinon.stub().returns true
    @isValidForTurn.exp = 'a good turn'

    @turn =
      meta:
        name: 'turn'
        params: [ name: 'direction', validate: @isValidForTurn ]

    @filePath = () -> 'a file path'
    @filePath.meta = name: 'file-path', params: [], returns: isString

    @commands = { @turn, 'file-path': @filePath, import: $import }

    stripLocation = new StripLocation
    parser = new Parser
    @analyzer = new Analyzer(new FlatScope @commands)
    @analyze = (text) => stripLocation.process @analyzer.analyze parser.parse text

  describe 'import', () ->

    it 'import with relative path', () ->
      exp = [
        type: 'command'
        name: 'turn'
        value: @turn
        args: [ type: 'value', value: 'north', param: 'direction' ]
        params: []
      ]
      act = @analyze 'import "./test/commands/test-import-turn-north.cljs"' # path relative to test execution
      @analyzer.errors.should.deep.equal []
      act.should.deep.equal exp
      @isValidForTurn.calledOnceWith('north').should.be.true

    it 'import after a command', () ->
      exp = [
        {
          type: 'command'
          name: 'turn'
          value: @turn
          args: [ type: 'value', value: 'south', param: 'direction' ]
          params: []
        }
        {
          type: 'command'
          name: 'turn'
          value: @turn
          args: [ type: 'value', value: 'north', param: 'direction' ]
          params: []
        }
      ]
      act = @analyze '(turn south) (import "./test/commands/test-import-turn-north.cljs")'
      @analyzer.errors.should.deep.equal []
      act.should.deep.equal exp
      @isValidForTurn.calledWith('south').should.be.true
      @isValidForTurn.calledWith('north').should.be.true

    it 'import twice the same file should import just once', () ->
      exp = [
        type: 'command'
        name: 'turn'
        value: @turn
        args: [ type: 'value', value: 'north', param: 'direction' ]
        params: []
      ]
      act = @analyze '''
        (import "./test/commands/test-import-turn-north.cljs")
        (import "./test/commands/test-import-turn-north.cljs")
      '''
      @analyzer.errors.should.deep.equal []
      act.should.deep.equal exp
      @isValidForTurn.calledOnceWith('north').should.be.true

    it 'import with absolute path', () ->
      exp = [
        type: 'command'
        name: 'turn'
        value: @turn
        args: [ type: 'value', value: 'north', param: 'direction' ]
        params: []
      ]
      filePath = path
        .join __dirname, 'test-import-turn-north.cljs' # absolute path
        .replace /\\/g, '\\\\'
      act = @analyze "import \"#{filePath}\""
      @analyzer.errors.should.deep.equal []
      act.should.deep.equal exp
      @isValidForTurn.calledOnceWith('north').should.be.true

    it 'import a file that imports a file', () ->
      exp = [
        type: 'command'
        name: 'turn'
        value: @turn
        args: [ type: 'value', value: 'north', param: 'direction' ]
        params: []
      ]
      act = @analyze 'import "./test/commands/test-import-import.cljs"'
      @analyzer.errors.should.deep.equal []
      act.should.deep.equal exp
      @isValidForTurn.calledOnceWith('north').should.be.true

    it 'import non-existent file', () ->
      @analyze 'import "./dummy.cljs"' # file doesn't exist
      @analyzer.errors.length.should.equal 1
      @analyzer.errors[0].text.should.match /^Error opening file ".*?dummy.cljs"/
      @analyzer.errors[0].loc.should.equal '1:8-1:21'

    it 'import file with bad syntax (parser problem)', () ->
      @analyze 'import "./test/commands/test-import-bad-syntax.cljs"'
      @analyzer.errors.length.should.equal 1
      @analyzer.errors[0].text.should.match /^SyntaxError/
      @analyzer.errors[0].loc.should.match /test-import-bad-syntax.cljs\/3:7-3:8$/ # file name in the location

    it 'import file with bad semantics (analyzer problem)', () ->
      @analyze 'import "./test/commands/test-import-bad-semantics.cljs"'
      @analyzer.errors.length.should.equal 1
      @analyzer.errors[0].text.should.equal 'Bad number of arguments to "turn": it takes 1 but was given 2'
      @analyzer.errors[0].loc.should.match /test-import-bad-semantics.cljs\/3:2-5:6$/ # file name in the location

    it 'import file path must not be a variable', () ->
      @analyze 'import :a-variable'
      @analyzer.errors.length.should.equal 1
      @analyzer.errors[0].text.should.equal 'Bad value ":a-variable" to "import" parameter 1 ("file-path"), must be a string'
      @analyzer.errors[0].loc.should.equal '1:8-1:18'

    it 'import file path must not be a string-returning command', () ->
      act = @analyze 'import (file-path)'
      @analyzer.errors.should.deep.equal [
        type: 'error'
        text: 'Bad call to "file-path" for "import" parameter 1 ("file-path"), must be a string'
        loc: '1:9-1:17'
      ]

    it 'import must be at the top level', () ->
      @analyze 'turn (import "irrelevant")'
      @analyzer.errors.length.should.equal 1
      @analyzer.errors[0].text.should.equal '"import" cannot be nested'
      @analyzer.errors[0].loc.should.equal '1:7-1:25'
