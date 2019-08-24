const {DocParser} = require('../src/commands/doc-parser');

////////////////////////////////////////////////////////

class WebCommandFormatter {

  constructor(command) {
    this.command = command;
  }

  formatParams() {
    return this.command.meta.params
      .map(param => ':' + param.name).join(' ');
  }

  formatSignature() {
    return `<h3><code>${this.command.meta.name} ${this.formatParams()}</code></h3>`;
  }

  recur(nodes) {
    return nodes.map(node => this[node.type](node)).join('');
  }

  untagged(node) {
    return this.recur(node.parts);
  }

  formatSample(sample) {
    sample = sample.replace(/^\s*?\n/, ''); // remove first empty lines
    let indentSize = sample.search(/[^ \t]|$/); // get indend size of first line
    sample = sample
      .replace(new RegExp(`^[ \\t]{${indentSize}}`, 'gm'), '') // unindent
      .replace(/^([ \t]+)/gm, (_, spaces) => spaces.replace(/\s/g, '&nbsp;')) // indentation
      .replace(/\n/g, '<br/>\n');
    return `<br/><br/><div class="sample">${sample}</div>`;
  }

  block(node) {
    let res = this.recur(node.parts);
    if (node.tag === 'example') return this.formatSample(res);
    return res;
  }

  inline(node) {
    if (node.tag === 'code') return `<code class="variable">${node.value}</code>`;
    return node.value;
  }

  text(node) {
    return node.value;
  }

  formatDesc() {
    let nodes = new DocParser().parse(this.command.meta.desc);
    return this.recur(nodes);
  }

  format() {
    return `${this.formatSignature()}${this.formatDesc()}`;
  }

}

////////////////////////////////////////////////////////

function setUpHelp(commander, runCommand) {
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commandNames = commander.commandNames;
  for (let i = 0; i < commandNames.length; ++i) {
    let commandName = commandNames[i];
    let command = commander.commands[commandName];
    divHelp.innerHTML += new WebCommandFormatter(command).format();
  }
  setUpSamples(runCommand);
}

////////////////////////////////////////////////////////

function setUpSamples(runCommand) {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.innerHTML
        .replace(/<br\s*\/?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim());
      location.hash = '#_';
    }));
}

////////////////////////////////////////////////////////

module.exports = {
  setUpHelp
};
