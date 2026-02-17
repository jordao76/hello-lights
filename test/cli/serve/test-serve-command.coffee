expect = require('chai').expect
sinon = require 'sinon'
http = require 'http'
{createApp} = require '../../../src/cli/serve'

request = (server, method, path, body) ->
  new Promise (resolve, reject) ->
    options =
      method: method
      hostname: 'localhost'
      port: server.address().port
      path: path
    req = http.request options, (res) ->
      data = ''
      res.on 'data', (chunk) -> data += chunk
      res.on 'end', -> resolve { statusCode: res.statusCode, headers: res.headers, body: data }
    req.on 'error', reject
    if body?
      req.setHeader 'Content-Type', 'text/plain'
      req.write body
    req.end()

describe 'serve command', ->

  describe 'HTTP server', ->

    beforeEach (done) ->
      @run = sinon.stub()
      @cancel = sinon.stub()
      @runDefinitions = sinon.stub()
      @process = sinon.stub()
      @mockCommander =
        run: @run
        cancel: @cancel
        runDefinitions: @runDefinitions
        commandNames: ['turn', 'blink', 'reset']
        fetchCommandNames: sinon.stub().resolves(['turn', 'blink', 'reset'])
        interpreter:
          process: @process
          lookup: (name) ->
            if name is 'turn'
              meta: { name: 'turn', params: [{name: 'light'}, {name: 'state'}], desc: 'Turns a light on or off.' }
            else
              null
        formatter:
          format: (meta) -> "#{meta.name} :#{meta.params.map((p) -> p.name).join(' :')}\n#{meta.desc}"
        manager:
          info: -> [{ serialNum: 123, status: 'connected' }]
      noop = ->
      @app = createApp @mockCommander, logger: { log: noop, error: noop }
      @server = @app.listen 0, done # port 0 = random available port

    afterEach (done) ->
      @server.close done

    it 'POST /run calls commander.run with the command string', ->
      request(@server, 'POST', '/run', 'blink 3 green 300')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledOnce @run
          sinon.assert.calledWith @run, 'blink 3 green 300', false

    it 'POST /run with empty body calls commander.run with empty string', ->
      request(@server, 'POST', '/run', '')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledOnce @run
          sinon.assert.calledWith @run, '', false

    it 'POST /run with ?reset=true passes reset flag', ->
      request(@server, 'POST', '/run?reset=true', 'blink 1 green 300')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledWith @run, 'blink 1 green 300', true

    it 'POST /run returns 400 for malformed command', ->
      @process.throws new Error('1:1-1:3: Command not found: "bad"')
      request(@server, 'POST', '/run', 'bad')
        .then (res) =>
          expect(res.statusCode).to.equal 400
          expect(res.body).to.include 'Command not found'
          sinon.assert.notCalled @run

    it 'POST /cancel calls commander.cancel', ->
      request(@server, 'POST', '/cancel', null)
        .then (res) =>
          expect(res.statusCode).to.equal 200
          sinon.assert.calledOnce @cancel

    it 'POST /definitions calls commander.runDefinitions', ->
      request(@server, 'POST', '/definitions', '(def foo (blink 1 green 300))')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledOnce @runDefinitions
          sinon.assert.calledWith @runDefinitions, '(def foo (blink 1 green 300))'

    it 'POST /definitions returns 400 for malformed definitions', ->
      @process.throws new Error('1:1-1:3: Command not found: "bad"')
      request(@server, 'POST', '/definitions', 'bad')
        .then (res) =>
          expect(res.statusCode).to.equal 400
          expect(res.body).to.include 'Command not found'
          sinon.assert.notCalled @runDefinitions

    it 'GET /commands returns JSON array of command names', ->
      request(@server, 'GET', '/commands', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.headers['content-type']).to.include 'application/json'
          names = JSON.parse(res.body)
          expect(names).to.deep.equal ['turn', 'blink', 'reset']

    it 'GET /commands/:name returns help text for known command', ->
      request(@server, 'GET', '/commands/turn', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.headers['content-type']).to.include 'text/x-ansi'
          expect(res.body).to.include 'turn'

    it 'GET /commands/:name returns 404 for unknown command', ->
      request(@server, 'GET', '/commands/unknown', null)
        .then (res) ->
          expect(res.statusCode).to.equal 404

    it 'GET /info returns JSON array of device info', ->
      request(@server, 'GET', '/info', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.headers['content-type']).to.include 'application/json'
          info = JSON.parse(res.body)
          expect(info).to.deep.equal [{ serialNum: 123, status: 'connected' }]

    it 'serves static files (index.html)', ->
      request(@server, 'GET', '/', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.body).to.include '<title>Hello Lights</title>'

    it 'serves static files (main.js)', ->
      request(@server, 'GET', '/main.js', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.body).to.include 'function run(commandStr)'

    it 'serves static files (style.css)', ->
      request(@server, 'GET', '/style.css', null)
        .then (res) ->
          expect(res.statusCode).to.equal 200
          expect(res.body).to.include '.container'

    it 'errors when port is already in use', (done) ->
      port = @server.address().port
      second = @app.listen port
      second.on 'error', (err) ->
        expect(err.code).to.equal 'EADDRINUSE'
        done()
