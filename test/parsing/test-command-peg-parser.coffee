require '../setup-unhandled-rejection'
parser = require '../../src/parsing/command-peg-parser'
require('chai').should()

describe 'Command PEG parser', () ->

  it 'should parse a parameterless command', () ->
    exp = [ type: 'command', params: [], name: 'turn' ]
    run = (str) -> parser.parse(str).should.deep.equal exp
    run 'turn'
    run ' \tturn\n '
    run '(turn)'
    run '\t ( turn  ) \n'
    run '\t ( turn ;a comment\n  ) \n'

  it 'should parse a command with parameters', () ->
    exp = [
      type: 'command', name: 'turn'
      params: [
        { type: 'value', value: 45 }
        { type: 'variable', name: 'degrees' }
        { type: 'value', value: 'north' }
      ]
    ]
    run = (str) -> parser.parse(str).should.deep.equal exp
    run 'turn 45 :degrees north'
    run '(turn 45 :degrees north)'
    run '(turn 45:degrees north)'
    run '(turn 45 :degrees "north")'

  it 'should parse nested commands', () ->
    exp = [
      type: 'command', name: 'define'
      params: [
        { type: 'value', value: 'turn-n' }
        { type: 'value', value: 'Do some turning' }
        { type: 'command', name: 'face', params: [ type: 'value', value: 'north' ] }
        { type: 'command', name: 'turn', params: [ type: 'variable', name: 'degrees' ] }
      ]
    ]
    run = (str) -> parser.parse(str).should.deep.equal exp
    run 'define turn-n "Do some turning" (face north) (turn :degrees)'
    run 'define turn-n"Do some turning"(face north)(turn :degrees)'
    run '(define turn-n "Do some turning" (face north) (turn :degrees))'

  it 'should parse multiple commands', () ->
    exp = [
      { type: 'command', name: 'face', params: [ type: 'value', value: 'north' ] }
      { type: 'command', name: 'turn', params: [ type: 'variable', name: 'degrees' ] }
    ]
    run = (str) -> parser.parse(str).should.deep.equal exp
    run '(face north) (turn :degrees)'
    run ' (face north)(turn:degrees) ;comment'
    run ';comment\n\t(face north)\n;comments\n(turn\n;comments\n:degrees) ;'
