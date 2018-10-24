require '../setup-unhandled-rejection'
require('chai').should()

{intersperse, flatten} = require '../../src/traffic-light/utils'

describe 'utils', () ->

  describe 'intersperse', () ->
    it 'array with len > 1', () ->
      intersperse(1, [2,3]).should.deep.equal [2,1,3]
      intersperse(1, [2,3,4]).should.deep.equal [2,1,3,1,4]
    it 'array with len == 1', () ->
      intersperse(1, [2]).should.deep.equal [2]
    it 'empty array', () ->
      intersperse(1, []).should.deep.equal []

  describe 'flatten', () ->
    it 'array with len > 1', () ->
      flatten([[1, 2],[3, 4]]).should.deep.equal [1, 2, 3, 4]
      flatten([[1],[2]]).should.deep.equal [1, 2]
    it 'array with len == 1', () ->
      flatten([[1, 2]]).should.deep.equal [1, 2]
      flatten([[1]]).should.deep.equal [1]
    it 'empty array', () ->
      flatten([[]]).should.deep.equal []
      flatten([]).should.deep.equal []
