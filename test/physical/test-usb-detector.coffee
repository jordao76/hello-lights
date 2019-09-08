require '../setup-unhandled-rejection'
{NullUsbDetector, UsbDetector} = require '../../src/physical/usb-detector'
require('chai').should()
sinon = require('sinon')

describe 'UsbDetector', ->

  beforeEach () ->
    @usbDetect =
      startMonitoring: sinon.spy()
      stopMonitoring: sinon.spy()
      on: sinon.spy()
    @detector = new UsbDetector @usbDetect

  it 'should call "startMonitoring" only once at the start', () ->
    sinon.assert.callCount @usbDetect.startMonitoring, 0
    @detector.startMonitoring()
    sinon.assert.callCount @usbDetect.startMonitoring, 1
    @detector.startMonitoring()
    sinon.assert.callCount @usbDetect.startMonitoring, 1 # doesn't change

  it 'should call "stopMonitoring" only once at the end', () ->
    sinon.assert.callCount @usbDetect.stopMonitoring, 0
    @detector.stopMonitoring()
    sinon.assert.callCount @usbDetect.stopMonitoring, 0 # never started
    @detector.startMonitoring()
    @detector.startMonitoring()
    @detector.stopMonitoring() # not yet matches the number of "startMonitoring" called
    sinon.assert.callCount @usbDetect.stopMonitoring, 0
    @detector.stopMonitoring() # now it matches
    sinon.assert.callCount @usbDetect.stopMonitoring, 1
    @detector.stopMonitoring()
    sinon.assert.callCount @usbDetect.stopMonitoring, 1 # doesn't change

  it 'should call "on" on the underlying usbDetect', () ->
    @detector.on 'eventName', 'callback'
    sinon.assert.calledWith @usbDetect.on, 'eventName', 'callback'

  it '"supportsMonitoring" should be true', () ->
    @detector.supportsMonitoring().should.be.true

describe 'NullUsbDetector', ->

  beforeEach () ->
    @detector = new NullUsbDetector

  it 'all operations are no-op', () ->
    @detector.startMonitoring()
    @detector.stopMonitoring()
    @detector.on()

  it '"supportsMonitoring" should be false', () ->
    @detector.supportsMonitoring().should.be.false
