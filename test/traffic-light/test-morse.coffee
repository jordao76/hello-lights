require '../setup-unhandled-rejection'
require('chai').should()

{
  timecodeSignal,
  timecodeLetter,
  timecodeWord,
  timecodePhrase,
  encodeWord,
  timecodeText
} = require '../../src/traffic-light/morse'

describe 'morse code utils', () ->
  it 'timecodeSignal', () ->
    timecodeSignal('.').should.equal 1
    timecodeSignal('-').should.equal 3
  it 'timecodeLetter', () ->
    timecodeLetter('.-').should.deep.equal [1, 1, 3]
  it 'timecodeWord', () ->
    timecodeWord(['.-','.-']).should.deep.equal [1, 1, 3, 3, 1, 1, 3]
  it 'timecodePhrase', () ->
    timecodePhrase([['.-'],['.-']]).should.deep.equal [1, 1, 3, 7, 1, 1, 3]
  it 'encodeWord', () ->
    encodeWord('aãa').should.deep.equal ['.-','.-']
    encodeWord('sos').should.deep.equal ['...','---','...']
    encodeWord('são').should.deep.equal ['...','---']
  it 'timecodeText', () ->
    timecodeText('  A   A  ').should.deep.equal [1, 1, 3, 7, 1, 1, 3, 7]
    timecodeText('  MORSE   CODE  ').should.deep.equal timecodeText('morse code')
    timecodeText('  SOS   SOS  ').should.deep.equal timecodeText('sos sos')
    timecodeText('  SÃOs   ').should.deep.equal timecodeText('sos')
