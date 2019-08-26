const {SimpleFormatter} = require('../src/commands/simple-formatter');

////////////////////////////////////////////////////////

class WebCommandFormatter extends SimpleFormatter {

  formatSignature(meta) {
    return `<h3><code>${super.formatSignature(meta)}</code></h3>`;
  }

  formatCode(code) {
    code = super.formatCode(code)
      .replace(/^([ \t]+)/gm, (_, spaces) => spaces.replace(/\s/g, '&nbsp;')) // indentation
      .replace(/\n/g, '<br/>\n');
    return `<br/><br/><div class="sample">${code}</div>`;
  }

  formatInlineCode(text) {
    return `<code class="variable">${text}</code>`;
  }

  format(command) {
    return super.format(command.meta);
  }

}

////////////////////////////////////////////////////////

function setUpHelp(commander, runCommand) {
  let formatter = new WebCommandFormatter();
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commandNames = commander.commandNames;
  for (let i = 0; i < commandNames.length; ++i) {
    let commandName = commandNames[i];
    let command = commander.commands[commandName];
    divHelp.innerHTML += formatter.format(command);
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
