////////////////////////////////////////////////////////

class WebCommandFormatter {

  constructor(command) {
    this.command = command;
  }

  formatParams() {
    return this.command.paramNames
      .map(param => ':' + param).join(' ');
  }

  formatSignature() {
    return `<h3><code>${this.command.doc.name} ${this.formatParams()}</code></h3>`;
  }

  formatVariable(variable) {
    return `<code class="variable">${variable}</code>`;
  }

  formatSample(sample) {
    sample = sample.trim().replace(/\n {2}/g, '\n&nbsp;&nbsp;'); // indentation
    return `:<br /><br /><div class="sample">${sample}</div>`;
  }

  formatDesc() {
    return this.command.doc.desc
      .replace(/'([^']+)'/g, (_, variable) => this.formatVariable(variable))
      .replace(/:(\s*\(.+\)\s*)$/s, (_, sample) => this.formatSample(sample))
      .replace(/\n/g, '<br />\n');
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
