let l = require('../src/traffic-light');
require('chai').should();

describe('Light', () => {
  it('should start as off', () => {
    let light = new l.Light();
    light.on.should.be.false;
    light.off.should.be.true;
  });
  it('should toggle', () => {
    let light = new l.Light();
    light.toggle();
    light.on.should.be.true;
    light.off.should.be.false;
    light.toggle();
    light.on.should.be.false;
    light.off.should.be.true;
  });
  it('should turn on and off', () => {
    let light = new l.Light();
    light.turnOn();
    light.on.should.be.true;
    light.off.should.be.false;
    light.turnOff();
    light.on.should.be.false;
    light.off.should.be.true;
  });
});

describe('TrafficLight', () => {
  it('should be representable as a bit string', () => {
    let tl = new l.TrafficLight();
    tl.toString().should.equal('000');
    tl.red.turnOn();
    tl.toString().should.equal('100');
    tl.red.turnOff();
    tl.toString().should.equal('000');
    tl.yellow.turnOn();
    tl.toString().should.equal('010');
    tl.yellow.turnOff();
    tl.toString().should.equal('000');
    tl.green.turnOn();
    tl.toString().should.equal('001');
    tl.green.turnOff();
    tl.toString().should.equal('000');
    tl.red.turnOn();
    tl.yellow.turnOn();
    tl.green.turnOn();
    tl.toString().should.equal('111');
  });
});
