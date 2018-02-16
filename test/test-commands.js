let c = require('../src/commands');
require('chai').should();
let sinon = require('sinon');
let nativeSetTimeout = setTimeout;
let yieldThen = (fn) => nativeSetTimeout(fn, 0);

class Light {
  constructor() { this.on = false; }
  toggle() { this.on = !this.on; }
}

describe('Commands', () => {

  beforeEach(() => this.clock = sinon.useFakeTimers());
  afterEach(() => this.clock.restore());

  describe('pause', () => {

    it('should pause for 500ms', (done) => {
        let paused = false;
        let run = async () => {
          await c.pause(500);
          paused = true;
        };
        run().then(() => {
          paused.should.be.true;
          done();
        });
        paused.should.be.false;
        this.clock.tick(500);
    });

    it('should be cancellable', (done) => {
      let paused = false;
      let run = async () => {
        await c.pause(5000);
        paused = true;
      };
      run().then(() => {
        paused.should.be.true;
        done();
      });
      paused.should.be.false;
      this.clock.tick(4000);
      c.cancel();
    });

  });

  describe('flash', () => {

    it('should flash for 500ms', (done) => {
      let light = new Light;
      let run = async () => {
        await c.flash(light, 250);
      };
      run().then(() => {
        light.on.should.be.false;
        done();
      });
      light.on.should.be.true;
      this.clock.tick(250);
      yieldThen(() => {
        light.on.should.be.false;
        this.clock.tick(250);
      });
    });

    it('should be cancellable', (done) => {
      let light = new Light;
      let run = async () => {
        await c.flash(light, 250);
      };
      run().then(() => {
        light.on.should.be.false;
        done();
      });
      light.on.should.be.true;
      this.clock.tick(100);
      c.cancel();
    });

  });

  describe('sparkle', () => {

    it('should flash twice', (done) => {
      let light = new Light;
      let run = async () => {
        await c.sparkle(light, 250, 2);
      };
      run().then(() => {
        light.on.should.be.false;
        done();
      });
      light.on.should.be.true;
      this.clock.tick(250);
      yieldThen(() => {
        light.on.should.be.false;
        this.clock.tick(250);
        yieldThen(() => {
          light.on.should.be.true;
          this.clock.tick(250);
          yieldThen(() => {
            light.on.should.be.false;
            this.clock.tick(250);
          });
        });
      });
    });

  });

});
