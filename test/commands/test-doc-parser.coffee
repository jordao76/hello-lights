require '../setup-unhandled-rejection'
{DocParser} = require '../../src/commands'
should = require('chai').should()

describe 'Doc parser', () ->

  # Node types:
  #   1. type: 'untagged', parts: [*inline*, *text*,...]
  #   2. type: 'block', tag, parts: [*inline*, *text*, ...]
  #   3. type: 'inline', tag, value: '...'
  #   4. type: 'text', value: '...'

  beforeEach () ->
    @parser = new DocParser
    @parse = (text) -> @parser.parse text
    @check = (str, exp) -> @parse(str).should.deep.equal exp

  it 'should parse a single text', () ->

    exp = [ type: 'untagged', parts: [ type: 'text', value: 'the paragraph' ] ]
    @check 'the paragraph', exp

  it 'should parse a single block tag', () ->

    exp = [ type: 'block', tag: 'para', parts: [ type: 'text', value: ' the paragraph' ] ]
    @check '@para the paragraph', exp

    exp = [ type: 'block', tag: 'para', parts: [ type: 'text', value: '\nthe paragraph' ] ]
    @check '@para\nthe paragraph', exp

    exp = [ type: 'block', tag: 'para', parts: [ type: 'text', value: '\n the paragraph' ] ]
    @check '@para\n the paragraph', exp

  it 'should parse text followed by a block tag', () ->

    exp = [
      { type: 'untagged', parts: [ type: 'text', value: 'first paragraph ' ] }
      { type: 'block', tag: 'para', parts: [ type: 'text', value: ' second paragraph' ] }
    ]
    @check 'first paragraph @para second paragraph', exp

  it 'should parse two block tags', () ->

    exp = [
      { type: 'block', tag: 'para', parts: [ type: 'text', value: '\nfirst paragraph\n\n' ] }
      { type: 'block', tag: 'para', parts: [ type: 'text', value: '\nsecond paragraph\n' ] }
    ]
    @check '@para\nfirst paragraph\n\n@para\nsecond paragraph\n', exp

  it 'should parse empty text', () ->

    @check '', []

  it 'should parse an empty block tag', () ->

    exp = [ type: 'block', tag: 'para', parts: [] ]
    @check '@para', exp

    exp = [
      { type: 'block', tag: 'para', parts: [ type: 'text', value: ' Some content ' ] }
      { type: 'block', tag: 'para', parts: [] }
    ]
    @check '@para Some content @para', exp

  it 'should parse inline tags', () ->

    exp = [
      type: 'untagged'
      parts: [
        { type: 'text', value: 'Some ' }
        { type: 'inline', tag: 'code', value: ' inline' }
        { type: 'text', value: ' tags' }
      ]
    ]
    @check 'Some {@code inline} tags', exp

  it 'should parse bounce doc string', () ->

    exp = [
      {
        type: 'untagged'
        parts: [
          { type: 'text', value: 'Bounce with the given duration ' }
          { type: 'inline', tag: 'code', value: ' ms' }
          { type: 'text', value: ':\n' }
        ]
      }
      {
        type: 'block',
        tag: 'example',
        parts: [ type: 'text', value: '\n(bounce 500)' ]
      }
    ]
    @check '''
      Bounce with the given duration {@code ms}:
      @example
      (bounce 500)''', exp
