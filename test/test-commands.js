let c = require('../src/commands');
require('chai').should();
let sinon = require('sinon');

describe('Commands', () => {

  describe('pause', () => {

    beforeEach(() => this.clock = sinon.useFakeTimers());
    afterEach(() => this.clock.restore());

    it('should pause for 500ms', (done) => {
        let paused = false;
        let run = async () => {
          await c.pause(500);
          paused = true;
          done();
        };
        run();
        paused.should.be.false;
        this.clock.tick(510);
    });

  });

});
