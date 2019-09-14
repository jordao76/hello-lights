fs = require 'fs'
should = require('chai')
  .use(require 'chai-string')
  .should()

describe 'README.md', () ->

  it 'documentation links should have the right version', () ->
    version = process.env.npm_package_version
    contents = fs.readFileSync('./README.md', 'utf8')
    links = contents.match /hello-lights\/doc\/hello-lights\/(?:\d+\.\d+\.\d+)/g
    should.exist links
    links.should.not.be.empty
    link.should.endWith(version) for link in links
