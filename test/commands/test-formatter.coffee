require '../setup-unhandled-rejection'
{Formatter} = require '../../src/commands'
should = require('chai').should()

describe 'Formatter', () ->

  aLight = exp: 'a light'
  aString = exp: 'a string'
  aNumber = exp: 'a number'
  aCommand = exp: 'a command'

  beforeEach () ->
    @formatter = new Formatter()

  describe 'code formatting', () ->

    it 'should format unindented code in one line', () ->
      code = '(morse green "hello-lights")'
      act = @formatter.formatCode(code)
      act.should.equal code # no change

    it 'should format indented code in one line', () ->
      code = '  (morse green "hello-lights")'
      exp = '(morse green "hello-lights")'
      act = @formatter.formatCode(code)
      act.should.equal exp

    it 'should format indented code in multiple lines', () ->
      code =
        '  \n  \n' +
        '  (activity\n\n' +
        '    (seconds 40)\n\n' +
        '    (seconds 10)\n\n' +
        '    (seconds 10))\n\n'
      exp = # trimmed and adjusted indentation
        '(activity\n\n' +
        '  (seconds 40)\n\n' +
        '  (seconds 10)\n\n' +
        '  (seconds 10))'
      act = @formatter.formatCode(code)
      act.should.equal exp

  describe 'signature formatting', () ->

    it 'should format a signature without parameters', () ->
      waitAMinute =
        name: 'wait-a-minute'
        params: []
      act = @formatter.formatSignature(waitAMinute)
      act.should.equal 'wait-a-minute'

    it 'should format a signature with parameters', () ->
      morse =
        name: 'morse'
        params: [
          { name: 'light', validate: aLight }
          { name: 'text', validate: aString }
        ]
      act = @formatter.formatSignature(morse)
      act.should.equal 'morse :light :text'

    it 'should format a signature with a return value', () ->
      minutes =
        name: 'minutes'
        params: [ name: 'min', validate: aNumber ]
        returns: aNumber
      act = @formatter.formatSignature(minutes)
      act.should.equal 'minutes :min -> a number'

    it 'should format a signature with a rest parameter', () ->
      all =
        name: 'all'
        params: [ name: 'command', validate: aCommand, isRest: true ]
      act = @formatter.formatSignature(all)
      act.should.equal 'all :command ...'

  describe 'description formatting', () ->

    it 'should format a description with inline code and an example', () ->
      morse = '''
        Morse code pattern with the given {@code :light} and {@code :text}.
        @example
        (morse green "hello-lights")'''
      act = @formatter.formatDesc(morse)
      act.should.equal(
        'Morse code pattern with the given `:light` and `:text`.\n' +
        '(morse green "hello-lights")\n')

    it 'should format a description in multiple lines', () ->
      morse =
        '  Morse code pattern with the given  \n  {@code :light} and {@code :text}.  '
      act = @formatter.formatDesc(morse)
      act.should.equal(
        # lines are trimmed
        'Morse code pattern with the given\n`:light` and `:text`.\n')

    it 'should format a description in multiple paragraphs', () ->
      morse =
        '  Morse code pattern with the given  \n\n  {@code :light} and {@code :text}.  '
      act = @formatter.formatDesc(morse)
      act.should.equal(
        'Morse code pattern with the given\n\n`:light` and `:text`.\n')

    it 'should format a description with multiple code samples', () ->
      morse = '''
        Morse code pattern with the given {@code :light} and {@code :text}.
        @example
        (morse green "hello-lights")
        @example
        (morse red "SOS")'''
      act = @formatter.formatDesc(morse)
      act.should.equal(
        'Morse code pattern with the given `:light` and `:text`.\n' +
        '(morse green "hello-lights")\n' +
        '(morse red "SOS")\n')

  describe 'command formatting', () ->

    it 'should format a command with usual tags (@code and @example)', () ->

      morse =
        name: 'morse'
        params: [
          { name: 'light', validate: aLight }
          { name: 'text', validate: aString }
        ]
        desc: '''
          Morse code pattern with the given {@code :light} and {@code :text}.
          @example
          (morse green "hello-lights")'''

      doc = @formatter.format(morse)
      doc.should.equal(
        'morse :light :text\n' +
        'Morse code pattern with the given `:light` and `:text`.\n' +
        '(morse green "hello-lights")\n')

    it 'should format a command with unknown tags', () ->

      morse =
        name: 'morse'
        params: [
          { name: 'light', validate: aLight }
          { name: 'text', validate: aString }
        ]
        desc: '''
          Morse code pattern with the given {@i :light} and {@i :text}.
          @sample
          (morse green "hello-lights")'''

      doc = @formatter.format(morse)
      doc.should.equal(
        'morse :light :text\n' +
        'Morse code pattern with the given :light and :text.\n' +
        '(morse green "hello-lights")\n')
