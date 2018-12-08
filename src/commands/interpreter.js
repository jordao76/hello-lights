/////////////////////////////////////////////////////////////////////////////

const {Parser} = require('./parser');
const {Analyzer} = require('./analyzer');
const {Generator} = require('./generator');

/////////////////////////////////////////////////////////////////////////////

const define = require('./define');

/////////////////////////////////////////////////////////////////////////////

class Interpreter {

  constructor(commands) {
    this.commands = {...commands, ...define.commands};
    this.parser = new Parser();
    this.analyzer = new Analyzer(this.commands);
    this.generator = new Generator();
  }

  async execute(text, ctx = {}) {
    let nodes = this.parser.parse(text);
    this.raiseIfErrors(this.parser.errors);

    nodes = this.analyzer.analyze(nodes);
    this.raiseIfErrors(this.analyzer.errors);

    let commands = this.generator.generate(nodes);
    this.raiseIfErrors(this.generator.errors);

    return Promise.all(
      commands.map(async command => await command(ctx)));
  }

  raiseIfErrors(errors) {
    if (errors.length === 0) return;
    throw new Error(errors.map(this.formatError).join('\n'));
  }

  formatError(error) {
    return `${error.loc}: ${error.text}`;
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {Interpreter};
