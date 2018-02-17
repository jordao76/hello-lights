let CommandParser = require('../src/command-parser');
require('chai').should();

describe('CommandParser', () => {

  var commands = {
    blink(light,n1,n2,ct) {
      this.blinked=[light,n1,n2,ct];
      return 95;
    },
    cycle(tl,ct) {
      this.cycled=[tl,ct];
      return 96;
    }
  };
  let cp = new CommandParser(commands);
  let tl = {red:32};

  it('should parse a light command', () => {
    let commandStr = 'blink red 500 10';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['blink'](tl['red'], 500, 10, ct)
    let res = command(tl, 78);
    commands.blinked.should.deep.equal([tl.red,500,10,78]);
    res.should.equal(95);
  });

  it('should parse a traffic light command', () => {
    let commandStr = 'cycle';
    let command = cp.parse(commandStr);
    // command will be
    //   (tl, ct) => commands['cycle'](tl, ct)
    let res = command(tl, 79);
    commands.cycled.should.deep.equal([tl,79]);
    res.should.equal(96);
  });

  xit('should handle errors in the command');

  xit('should parse array parameters');

});
