require '../setup-unhandled-rejection'
{CodeFormatter} = require '../../src/commands'
should = require('chai').should()

describe 'CodeFormatter', () ->

  beforeEach () ->
    @formatter = new CodeFormatter()

  it 'should format a one-line command', () ->
    code = '(morse green "hello-lights")'
    act = @formatter.format(code)
    act.should.equal code # no change

  it 'should preserve indentation when formatting', () ->
    code =
      '\n\n' +
      '  (activity\n\n' +
      '    (seconds 40)\n\n' +
      '    (seconds 10)\n\n' +
      '    (seconds 10))\n\n'
    act = @formatter.format(code)
    act.should.equal code # no change

  it 'should preserve comments when formatting', () ->
    code =
      '(define burst\n' +
      '  "Burst of light"\n' +
      '  (twinkle :light 80))\n\n' +
      '; use the new command\n' +
      '(burst red)\n'
    act = @formatter.format(code)
    act.should.equal code # no change

  it 'should not fail with code with errors, but return the original text', () ->
    code = '(morse green "hello-lights"' # no closing parens
    act = @formatter.format(code)
    act.should.equal code # no change
