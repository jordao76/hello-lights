let CommandParser = require('../src/command-parser');
require('chai').should();

describe('CommandParser', () => {

  var commands = {};
  let cp = new CommandParser(commands);
  let tl = {red:32, yellow:33, green:34};

  it('should parse a light command', async () => {
    commands.blink = function(light,n1,n2,ct) {
      this.blinked=[light,n1,n2,ct];
      return 95;
    };
    let commandStr = 'blink red 500 10';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['blink'](tl['red'], 500, 10, ct)
    let res = await command(tl, 78);
    commands.blinked.should.deep.equal([tl.red,500,10,78]);
    res.should.equal(95);
  });

  it('should parse a traffic light command', async () => {
    commands.cycle = function(tl,ct) {
      this.cycled=[tl,ct];
      return 96;
    };
    let commandStr = 'cycle';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['cycle'](tl, ct)
    let res = await command(tl, 79);
    commands.cycled.should.deep.equal([tl,79]);
    res.should.equal(96);
  });

  it('should parse array parameters', async () => {
    commands.turn = function(arr,n,ct) {
      this.turned=[arr,n,ct];
      return 97;
    };
    let commandStr = 'turn (red green yellow 10) 100';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['turn']([tl.red, tl.green, tl.yellow, 10], 100, ct)
    let res = await command(tl, 80);
    commands.turned.should.deep.equal([[tl.red,tl.green,tl.yellow,10],100,80]);
    res.should.equal(97);
  });

  it('should parse string parameters that are not lights', async () => {
    commands.stringy = function(tl,str,n,ct) {
      this.stringed=[tl,str,n,ct];
      return 98;
    };
    let commandStr = 'stringy blue 101';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['stringy'](tl,'blue', 101, ct)
    let res = await command(tl, 81);
    commands.stringed.should.deep.equal([tl,'blue',101,81]);
    res.should.equal(98);
  });

  it('shows how to handle errors in the command', async (done) => {
    let commandStr = 'invalid red';
    let command = cp.parse(commandStr);
    try {
      let res = await command(82);
    } catch(e) {
      e.toString().should.have.string('TypeError');
      done();
    }
  });

});
