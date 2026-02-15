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
    req.write body if body
    req.end()

describe 'serve command', ->

  describe 'HTTP server', ->

    beforeEach (done) ->
      @run = sinon.stub()
      @mockCommander = { @run }
      @app = createApp @mockCommander
      @server = @app.listen 0, done # port 0 = random available port

    afterEach (done) ->
      @server.close done

    it 'POST /run calls commander.run with the command string', ->
      request(@server, 'POST', '/run', 'blink 3 green 300')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledOnce @run
          sinon.assert.calledWith @run, 'blink 3 green 300'

    it 'POST /run with empty body calls commander.run with empty string', ->
      request(@server, 'POST', '/run', '')
        .then (res) =>
          expect(res.statusCode).to.equal 202
          sinon.assert.calledOnce @run
          sinon.assert.calledWith @run, ''

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
