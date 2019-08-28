const {MetaFormatter} = require('../src/commands/meta-formatter');
const {CodeFormatter} = require('../src/commands/code-formatter');

////////////////////////////////////////////////////////

class WebCodeFormatter extends CodeFormatter {

  formatIdentifier(text) {
    if (['red', 'yellow', 'green'].indexOf(text) >= 0) {
      return `<span class='code-identifier-${text}'>${text}</span>`;
    }
    return `<span class='code-identifier'>${text}</span>`;
  }

}
{
  const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
  const def = type => WebCodeFormatter.prototype[`format${capitalize(type)}`] =
    function(text) { return `<span class='code-${type}'>${text}</span>`; };
  def('command'); // WebCodeFormatter.prototype.formatCommand(text) { return `<span class='code-command'>${text}</span>`; }
  def('variable'); // ...
  def('number');
  def('string');
  def('comment');
}

////////////////////////////////////////////////////////

let defaultFormatter = new MetaFormatter();

class WebMetaFormatter extends MetaFormatter {

  constructor() {
    super(new WebCodeFormatter());
  }

  formatSignature(meta) {
    return `<h3><code>${super.formatSignature(meta)}</code></h3>`;
  }

  formatCode(code) {
    let executable = defaultFormatter.formatCode(code)
      .replace(/\\/g, '&#92;')
      .replace(/"/g, '&quot;');
    let formatted = super.formatCode(code)
      .replace(/^([ \t]+)/gm, (_, spaces) => spaces.replace(/\s/g, '&nbsp;')) // indentation
      .replace(/\n/g, '<br/>\n');
    return `<br/><br/><div class="sample" data-sample="${executable}">${formatted}</div>`;
  }

  formatInlineCode(text) {
    return `<code class="variable">${text}</code>`;
  }

}

////////////////////////////////////////////////////////

function setUpHelp(commander, runCommand) {
  let formatter = new WebMetaFormatter();
  let divHelp = document.querySelector('#help');
  divHelp.innerHTML = '<h2 id="help-title">Commands</h2>';
  let commandNames = commander.commandNames;
  for (let i = 0; i < commandNames.length; ++i) {
    let commandName = commandNames[i];
    let command = commander.commands[commandName];
    divHelp.innerHTML += formatter.format(command.meta);
  }
  setUpSamples(runCommand);
}

////////////////////////////////////////////////////////

function setUpSamples(runCommand) {
  let txtSamples = document.querySelectorAll('.sample');
  txtSamples.forEach(txtSample =>
    txtSample.addEventListener('click', () => {
      location.hash = '#top';
      runCommand(txtSample.getAttribute('data-sample'));
      location.hash = '#_';
    }));
}

////////////////////////////////////////////////////////

module.exports = {
  setUpHelp
};
