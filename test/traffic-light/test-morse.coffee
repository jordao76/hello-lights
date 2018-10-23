require '../setup-unhandled-rejection'
{encode, timecode, morse} = require '../../src/traffic-light/morse'
require('chai').should()

describe 'morse code command', () ->

  describe 'encode', () ->
    it 'should encode a char', () ->
      encode('A').should.deep.equal ['.-']
    it 'should encode a word', () ->
      encode('SOS').should.deep.equal ['...','---','...']
    it 'should encode a phrase', () ->
      encode('MORSE CODE').should.deep.equal [
        '--', '---', '.-.', '...', '.' # morse
        ' ' # space
        '-.-.', '---', '-..', '.' # code
      ]
    it 'should encode special char as a space', () ->
      encode('AÃA').should.deep.equal ['.-', ' ', '.-']
    it 'should trim spaces', () ->
      encode(' MORSE CODE ').should.deep.equal encode('MORSE CODE')
      encode(' ').should.deep.equal [] # all trimmed
      encode('Ã').should.deep.equal [] # all trimmed
    it 'should ignore case', () ->
      encode('MORSE CODE').should.deep.equal encode('morse code')

  describe 'timecode', () ->
    it 'should timecode a char', () ->
      timecode(encode 'A').should.deep.equal [
        # A -> .-
        1 # . (dot - on for 1 unit)
        1 # between signals (off for 1 unit)
        3 # - (dash - on for 3 units)
        7 # end of input (off for 7 units)
      ]
    it 'should timecode a word', () ->
      timecode(encode 'AA').should.deep.equal [
        1, 1, 3 # A
        3 # between letters (off for 3 units)
        1, 1, 3 # A
        7 # end of input (off for 7 units)
      ]
    it 'should timecode a phrase', () ->
      timecode(encode 'AA AA').should.deep.equal [
        1, 1, 3, 3, 1, 1, 3 # AA
        7 # between words (off for 7 units)
        1, 1, 3, 3, 1, 1, 3 # AA
        7 # end of input (off for 7 units)
      ]
    it 'should timecode an empty string', () ->
      timecode(encode ' ').should.deep.equal []
