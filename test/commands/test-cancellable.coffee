require '../setup-unhandled-rejection'
{Cancellable} = require '../../src/commands'
chai = require 'chai'
should = chai.should()
sinon = require('sinon')

describe 'Cancellable', () ->

  beforeEach () ->
    @ct = new Cancellable
    @resolve = sinon.stub()

  it 'add a timeout ID (nested ID) and cancel it', () ->
    @ct.add {id: 42}, @resolve
    @ct.isCancelled.should.be.false
    @ct.cancel()
    @ct.isCancelled.should.be.true
    @resolve.callCount.should.equal 1
    @ct.cancel() # cancel again
    @resolve.callCount.should.equal 1 # no change

  it 'add a timeout ID (direct) and cancel it', () ->
    @ct.add 42, @resolve
    @ct.isCancelled.should.be.false
    @ct.cancel()
    @ct.isCancelled.should.be.true
    @resolve.callCount.should.equal 1
    @ct.cancel() # cancel again
    @resolve.callCount.should.equal 1 # no change

  it 'add a timeout ID (nested ID) and delete it', () ->
    @ct.add {id: 42}, @resolve
    @ct.isCancelled.should.be.false
    @ct.del {id: 42}
    @ct.cancel()
    @ct.isCancelled.should.be.true
    @resolve.callCount.should.equal 0

  it 'add a timeout ID (direct) and delete it', () ->
    @ct.add 42, @resolve
    @ct.isCancelled.should.be.false
    @ct.del 42
    @ct.cancel()
    @ct.isCancelled.should.be.true
    @resolve.callCount.should.equal 0
