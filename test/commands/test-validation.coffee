require '../setup-unhandled-rejection'
{
  isIdentifier,
  isString,
  isNumber,
  isCommand
} = require('../../src/commands').validation
chai = require 'chai'
should = chai.should()

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
