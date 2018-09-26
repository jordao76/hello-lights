require './setup-unhandled-rejection'
{Device} = require '../src/device'
require('chai').should()
sinon = require('sinon')

describe 'Device', ->

  createDevice = (connected) ->
    @device = new Device('1', connected) # 1 is the Serial Number
    @device.turn = sinon.stub()
    @onConnectedCalled = false
    @onDisconnectedCalled = false
    @device.onConnected () => @onConnectedCalled = true
    @device.onDisconnected () => @onDisconnectedCalled = true

  describe 'connected device', ->

    beforeEach () -> createDevice.call @, true

    it 'should have isConnected true', ->
      @device.isConnected.should.be.true

    describe 'connect it', ->
      beforeEach () -> @device.connect()
      it 'should still have isConnected true', ->
        @device.isConnected.should.be.true
      it 'should NOT raise "connected"', ->
        @onConnectedCalled.should.be.false

    describe 'disconnect it', ->
      beforeEach () -> @device.disconnect()
      it 'should have isConnected false', ->
        @device.isConnected.should.be.false
      it 'should raise "disconnected"', ->
        @onDisconnectedCalled.should.be.true

  describe 'disconnected device', ->

    beforeEach () -> createDevice.call @, false

    it 'should have isConnected false', ->
      @device.isConnected.should.be.false

    describe 'disconnect it', ->
      beforeEach () -> @device.disconnect()
      it 'should still have isConnected false', ->
        @device.isConnected.should.be.false
      it 'should NOT raise "disconnected"', ->
        @onDisconnectedCalled.should.be.false

    describe 'connect it', ->
      beforeEach () -> @device.connect()
      it 'should have isConnected true', ->
        @device.isConnected.should.be.true
      it 'should raise "connected"', ->
        @onConnectedCalled.should.be.true
