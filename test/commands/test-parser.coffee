require '../setup-unhandled-rejection'
{Parser} = require '../../src/commands'
{StripLocation} = require './strip-location'
should = require('chai').should()

describe 'Command parser', () ->

  beforeEach () -> @parser = new Parser

  describe 'location agnostic', () ->

    beforeEach () ->
      stripLocation = new StripLocation
      @parse = (text) ->
        nodes = stripLocation.process @parser.parse text
        @parser.errors.length.should.equal 0
        nodes

    it 'should parse a parameterless command', () ->
      exp = [ type: 'command', args: [], name: 'turn' ]
      run = (str) => @parse(str).should.deep.equal exp
      run 'turn'
      run ' \tturn\n '
      run '(turn)'
      run '\t ( turn  ) \n'
      run '\t ( turn ;a comment\n  ) \n'

    it 'should parse a command with parameters', () ->
      exp = [
        type: 'command', name: 'turn'
        args: [
          { type: 'value', value: 45 }
          { type: 'variable', name: 'degrees' }
          { type: 'value', value: 'north' }
        ]
      ]
      run = (str) => @parse(str).should.deep.equal exp
      run 'turn 45 :degrees north'
      run '(turn 45 :degrees north)'
      run '(turn 45:degrees north)'
      run '(turn 45 :degrees "north")'

    it 'should parse nested commands', () ->
      exp = [
        type: 'command', name: 'define'
        args: [
          { type: 'value', value: 'turn-n' }
          { type: 'value', value: 'Do some turning' }
          { type: 'command', name: 'face', args: [ type: 'value', value: 'north' ] }
          { type: 'command', name: 'turn', args: [ type: 'variable', name: 'degrees' ] }
        ]
      ]
      run = (str) => @parse(str).should.deep.equal exp
      run 'define turn-n "Do some turning" (face north) (turn :degrees)'
      run 'define turn-n"Do some turning"(face north)(turn :degrees)'
      run '(define turn-n "Do some turning" (face north) (turn :degrees))'

    it 'should parse multiple commands', () ->
      exp = [
        { type: 'command', name: 'face', args: [ type: 'value', value: 'north' ] }
        { type: 'command', name: 'turn', args: [ type: 'variable', name: 'degrees' ] }
      ]
      run = (str) => @parse(str).should.deep.equal exp
      run '(face north) (turn :degrees)'
      run ' (face north)(turn:degrees) ;comment'
      run ';comment\n\t(face north)\n;comments\n(turn\n;comments\n:degrees) ;'

  describe 'location aware', () ->

    it 'should parse a parameterless command', () ->
      exp = [ type: 'command', args: [], name: 'turn', loc: '1:1-1:4' ]
      str = 'turn'
      @parser.parse(str).should.deep.equal exp
      @parser.errors.length.should.equal 0

    it 'should parse nested commands', () ->
      exp = [
        {
          type: 'command', name: 'define', loc: '1:2-1:65'
          args: [
            { type: 'value', value: 'turn-n', loc: '1:9-1:14' }
            { type: 'value', value: 'Turn from the north', loc: '1:16-1:36' }
            {
              type: 'command', name: 'face', loc: '1:39-1:48', args: [
                type: 'value', value: 'north', loc: '1:44-1:48'
              ]
            }
            {
              type: 'command', name: 'turn', loc: '1:52-1:64', args: [
                type: 'variable', name: 'degrees', loc: '1:57-1:64'
              ]
            }
          ]
        }
        {
          type: 'command', name: 'turn-n', loc: '1:69-1:77'
          args: [ type: 'value', value: 45, loc: '1:76-1:77' ]
        }
      ]
      # locations (all on the 1st line):
      # col:                                                                 65 68    74 77
      # col: 1      8       16                    38    44   49 52   57     64 67       76
      # col:  2    7 9    14                    36 39 42    48 51  55         66 69       78
      str = '(define turn-n "Turn from the north" (face north) (turn :degrees)) (turn-n 45)'
      @parser.parse(str).should.deep.equal exp
      @parser.errors.length.should.equal 0

  describe 'parse errors', () ->

    it 'fail to close a parenthesis', () ->
      should.not.exist @parser.parse '(turn'
      @parser.errors.length.should.equal 1
      @parser.errors[0].text.should.match /^SyntaxError: Expected.+"\)".+but end of input found/
      @parser.errors[0].loc.should.equal '1:6-1:6'

    it 'empty string', () ->
      should.not.exist @parser.parse ''
      @parser.errors.length.should.equal 1
      @parser.errors[0].text.should.match /^SyntaxError: Expected.+but end of input found/
      @parser.errors[0].loc.should.equal '1:1-1:1'
