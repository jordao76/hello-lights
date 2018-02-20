{Light} = require '../src/traffic-light'
require('chai').should()

describe 'Light', () ->

  it 'should start as off', () ->
    light = new Light
    light.on.should.be.false
    light.off.should.be.true

  it 'should toggle', () ->
    light = new Light
    light.toggle()
    light.on.should.be.true
    light.off.should.be.false
    light.toggle()
    light.on.should.be.false
    light.off.should.be.true

  it 'should turn on and off', () ->
    light = new Light
    light.turnOn()
    light.on.should.be.true
    light.off.should.be.false
    light.turnOff()
    light.on.should.be.false
    light.off.should.be.true
