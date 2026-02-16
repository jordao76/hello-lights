expect = require('chai').expect
sinon = require 'sinon'
yargs = require '../../src/cli/yargs'
commanderOptions = require '../../src/cli/commander-options'

describe 'commander-options', () ->

  beforeEach () ->
    run = sinon.stub()
    close = sinon.stub()
    stubCommander = { run, close }
    @resolveCommander = sinon.stub(commanderOptions, 'resolveCommander')
      .returns stubCommander

  afterEach () ->
    @resolveCommander.restore()

  describe '--device-type', () ->

    it 'default --device-type is cleware', () ->
      yargs.parse 'exec hello', (err, argv, output) ->
        expect(argv.deviceType).to.equal 'cleware'
        expect(err).to.be.null
    it '--device-type cleware', () ->
      yargs.parse '--device-type cleware exec hello', (err, argv, output) ->
        expect(argv.deviceType).to.equal 'cleware'
        expect(err).to.be.null
    it '--device-type wrong', () ->
      yargs.parse '--device-type wrong exec hello', (err, argv, output) ->
        expect(err.message).to.include 'Invalid values'
        expect(err.message).to.include 'Argument: device-type, Given: "wrong", Choices: "cleware"'

  describe '--serial-num', () ->

    it '--serial-num 42', () ->
      yargs.parse '--serial-num 42 exec hello', (err, argv, output) ->
        expect(argv.serialNum).to.equal 42
        expect(err).to.be.null
    it '--serial-num blahblah', () ->
      yargs.parse '--serial-num blahblah exec hello', (err, argv, output) ->
        expect(argv.serialNum).to.equal 'blahblah'
        expect(err).to.be.null

  describe '--device-path', () ->

    it '--device-path has no default', () ->
      yargs.parse 'exec hello', (err, argv, output) ->
        expect(argv.devicePath).to.be.undefined
        expect(err).to.be.null
    it '--device-path test/cli/dummy-device', () ->
      yargs.parse '--device-path test/cli/dummy-device exec hello', (err, argv, output) ->
        # take care of Windows paths as well
        expect(['test/cli/dummy-device', 'test\\cli\\dummy-device']).to.include argv.devicePath
        expect(err).to.be.null

  describe '--selector', () ->

    it 'default --selector is single', () ->
      yargs.parse 'exec hello', (err, argv, output) ->
        expect(argv.selector).to.equal 'single'
        expect(err).to.be.null
    it '--selector single', () ->
      yargs.parse '--selector single exec hello', (err, argv, output) ->
        expect(argv.selector).to.equal 'single'
        expect(err).to.be.null
    it '--selector multi', () ->
      yargs.parse '--selector multi exec hello', (err, argv, output) ->
        expect(argv.selector).to.equal 'multi'
        expect(err).to.be.null
    it '--selector http', () ->
      yargs.parse '--selector http exec hello', (err, argv, output) ->
        expect(argv.selector).to.equal 'http'
        expect(err).to.be.null
    it '--selector wrong', () ->
      yargs.parse '--selector wrong exec hello', (err, argv, output) ->
        expect(err.message).to.include 'Invalid values'
        expect(err.message).to.include 'Argument: selector, Given: "wrong", Choices: "single", "multi", "http"'
    it 'no selector given: --selector', () ->
      yargs.parse '--selector exec hello', (err, argv, output) ->
        expect(err.message).to.include 'Invalid values'
        expect(err.message).to.include 'Argument: selector, Given: "exec", Choices: "single", "multi", "http"'

  describe '--host', () ->

    it 'default --host is http://localhost:9000', () ->
      yargs.parse 'exec hello', (err, argv, output) ->
        expect(argv.host).to.equal 'http://localhost:9000'
        expect(err).to.be.null
    it '--host custom', () ->
      yargs.parse '--host http://myserver:3000 exec hello', (err, argv, output) ->
        expect(argv.host).to.equal 'http://myserver:3000'
        expect(err).to.be.null

describe 'resolveCommander', () ->

  {PhysicalTrafficLightSelector, PhysicalMultiTrafficLightSelector} =
    require('../../src').selectors
  {RestCommander} = require('../../src')

  beforeEach () ->
    # use sinon to prevent usb-detect to kick in with the ClewareSwitch1DeviceManager
    {Manager} = require '../../src/devices/cleware-switch1'
    @startMonitoring = sinon.stub(Manager, 'startMonitoring')
    @stopMonitoring = sinon.stub(Manager, 'stopMonitoring')
    @clewareManager = Manager

  afterEach () ->
    @startMonitoring.restore()
    @stopMonitoring.restore()

  it '--device cleware --selector single', () ->
    options =
      device: 'cleware'
      selector: 'single'
    commander = commanderOptions.resolveCommander(options)
    expect(commander.selector).to.be.an.instanceof PhysicalTrafficLightSelector
    expect(commander.selector.manager).to.equal @clewareManager
    expect(commander.selector.serialNum).to.be.null

  it '--device cleware --selector multi', () ->
    options =
      device: 'cleware'
      selector: 'multi'
    commander = commanderOptions.resolveCommander(options)
    expect(commander.selector).to.be.an.instanceof PhysicalMultiTrafficLightSelector
    expect(commander.selector.manager).to.equal @clewareManager

  it '--device-path test/cli/dummy-device', () ->
    options =
      devicePath: 'test/cli/dummy-device'
      device: 'cleware' # ignored in the presence of --device-path
      selector: 'single'
    commander = commanderOptions.resolveCommander(options)
    expect(commander.selector.manager).to.equal require('./dummy-device').Manager

  it '--serial-num 42 --selector single', () ->
    options =
      device: 'cleware'
      serialNum: 42
      selector: 'single'
    commander = commanderOptions.resolveCommander(options)
    expect(commander.selector.serialNum).to.equal 42

  it 'No effect with multi: --serial-num 42 --selector multi', () ->
    options =
      device: 'cleware'
      serialNum: 42
      selector: 'multi'
    commander = commanderOptions.resolveCommander(options)
    expect(commander.selector.serialNum).to.be.undefined # multi doesn't use a serialNum

  it '--selector http', () ->
    options =
      selector: 'http'
      host: 'http://localhost:9000'
    commander = commanderOptions.resolveCommander(options)
    expect(commander).to.be.an.instanceof RestCommander

  it '--selector http with custom host', () ->
    options =
      selector: 'http'
      host: 'http://myserver:3000'
    commander = commanderOptions.resolveCommander(options)
    expect(commander).to.be.an.instanceof RestCommander
