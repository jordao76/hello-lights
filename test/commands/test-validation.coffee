require '../setup-unhandled-rejection'
{
  makeNumber,
  makeOptions,
  isIdentifier,
  isString,
  isNumber,
  isCommand
} = require('../../src/commands').validation
chai = require 'chai'
should = chai.should()

describe 'Command validation factories', () ->

  it 'makeNumber', () ->
    isNumber = makeNumber()
    isNumber(123).should.be.true
    isNumber("123").should.be.false
    isNumber.type.should.equal 'number'
    isNumber.exp.should.equal 'number'

    isMs = makeNumber('ms', 70)
    isMs(123).should.be.true
    isMs(70).should.be.true
    isMs(69).should.be.false
    isMs.min.should.equal 70
    isMs.type.should.equal 'ms'
    isMs.exp.should.equal 'ms [70,+∞]'

    isTemp = makeNumber('temp', -273, 10000)
    isTemp(123).should.be.true
    isTemp(-273).should.be.true
    isTemp(-274).should.be.false
    isTemp(10000).should.be.true
    isTemp(10001).should.be.false
    isTemp.min.should.equal -273
    isTemp.max.should.equal 10000
    isTemp.type.should.equal 'temp'
    isTemp.exp.should.equal 'temp [-273,10000]'

    isGrade = makeNumber('grade', null, 10)
    isGrade(-273).should.be.true
    isGrade(10).should.be.true
    isGrade(11).should.be.false
    isGrade.max.should.equal 10
    isGrade.type.should.equal 'grade'
    isGrade.exp.should.equal 'grade [-∞,10]'

  it 'options', () ->
    isLight = makeOptions 'light', ['red','green','yellow']
    isLight('red').should.be.true
    isLight('green').should.be.true
    isLight('rouge').should.be.false
    isLight.type.should.equal 'light'
    isLight.exp.should.equal '"red" or "green" or "yellow"'

describe 'Command validations', () ->

  it 'isIdentifier', () ->
    isIdentifier('identifier42').should.be.true
    isIdentifier('IDENTIFIER42').should.be.true
    isIdentifier('an-identifier-42').should.be.true
    isIdentifier('an_identifier_42').should.be.true
    isIdentifier('_an-identifier-42_').should.be.true
    isIdentifier('-an-identifier42').should.be.false
    isIdentifier('an-identifier-42-').should.be.false
    isIdentifier('-an-identifier-42').should.be.false
    isIdentifier('42identifier').should.be.false
    isIdentifier('42-an-identifier').should.be.false
    isIdentifier(42).should.be.false
    isIdentifier('an identifier').should.be.false
    isIdentifier('identifier 42').should.be.false
    isIdentifier('').should.be.false
    isIdentifier(' ').should.be.false
    isIdentifier('an\nidentifier').should.be.false
    isIdentifier(()->{}).should.be.false

  it 'isString', () ->
    isString('a string').should.be.true
    isString('').should.be.true
    isString(42).should.be.false
    isString(()->{}).should.be.false

  it 'isNumber', () ->
    isNumber('a string').should.be.false
    isNumber('').should.be.false
    isNumber(42).should.be.true
    isNumber(0).should.be.true
    isNumber(()->{}).should.be.false

  it 'isCommand', () ->
    isCommand('a string').should.be.false
    isCommand(42).should.be.false
    isCommand(()->{}).should.be.true
