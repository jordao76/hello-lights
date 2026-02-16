expect = require('chai').expect
sinon = require 'sinon'
{RestCommander} = require '../src/rest-commander'
{createApp} = require '../src/cli/serve'

describe 'RestCommander', ->

  beforeEach (done) ->
    @mockCommander =
      run: sinon.stub()
      cancel: sinon.stub()
      runDefinitions: sinon.stub()
      commandNames: ['turn', 'blink', 'reset']
      fetchCommandNames: sinon.stub().resolves(['turn', 'blink', 'reset'])
      interpreter:
        lookup: (name) ->
          if name is 'turn'
            meta: { name: 'turn', params: [{name: 'light'}, {name: 'state'}], desc: 'Turns a light on or off.' }
          else
            null
      formatter:
        format: (meta) -> "#{meta.name} :#{meta.params.map((p) -> p.name).join(' :')}\n#{meta.desc}"
      manager:
        info: -> [{ serialNum: 123, status: 'connected' }]
    app = createApp @mockCommander
    @server = app.listen 0, =>
      port = @server.address().port
      @logger = { log: sinon.stub(), error: sinon.stub() }
      @rc = new RestCommander { host: "http://localhost:#{port}", logger: @logger }
      done()

  afterEach (done) ->
    @server.close done

  describe 'run', ->

    it 'sends POST /run with the command string', ->
      @rc.run('blink 3 green 300').then =>
        sinon.assert.calledOnce @mockCommander.run
        sinon.assert.calledWith @mockCommander.run, 'blink 3 green 300', false

    it 'sends POST /run with reset=true', ->
      @rc.run('blink 1 green 300', true).then =>
        sinon.assert.calledWith @mockCommander.run, 'blink 1 green 300', true

  describe 'cancel', ->

    it 'sends POST /cancel', ->
      @rc.cancel().then =>
        sinon.assert.calledOnce @mockCommander.cancel

  describe 'runDefinitions', ->

    it 'sends POST /definitions with the command string', ->
      @rc.runDefinitions('(def foo (blink 1 green 300))').then =>
        sinon.assert.calledOnce @mockCommander.runDefinitions
        sinon.assert.calledWith @mockCommander.runDefinitions, '(def foo (blink 1 green 300))'

  describe 'fetchCommandNames', ->

    it 'returns array of command names', ->
      @rc.fetchCommandNames().then (names) ->
        expect(names).to.deep.equal ['turn', 'blink', 'reset']

  describe 'help', ->

    it 'logs help text for known command', ->
      @rc.help('turn').then =>
        sinon.assert.calledOnce @logger.log
        expect(@logger.log.firstCall.args[0]).to.include 'turn'

    it 'logs error for unknown command', ->
      @rc.help('unknown').then =>
        sinon.assert.calledOnce @logger.error
        expect(@logger.error.firstCall.args[0]).to.include 'unknown'

  describe 'logInfo', ->

    it 'logs device info', ->
      @rc.logInfo().then =>
        expect(@logger.log.calledWith('Known devices:')).to.be.true
        expect(@logger.log.calledWith('device 123: connected')).to.be.true

  describe 'close', ->

    it 'is a no-op', ->
      @rc.close() # should not throw
