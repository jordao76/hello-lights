/////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');
const {isString} = require('./validation');
const {Analyzer} = require('./analyzer');
const {Parser} = require('./parser');

/////////////////////////////////////////////////////////////////////////////

function $import({root, node, scope}) {
  let errors = validate(node, root);
  if (errors.length > 0) return errors;

  let arg = node.args[0];
  let filePath = arg.value;

  // keep track of the visited paths in a stack (use the scope)
  let stack = scope.__stack = scope.__stack || [];

  // make sure the path is absolute
  if (stack.length > 0 && !path.isAbsolute(filePath)) {
    let baseDir = path.dirname(stack[stack.length - 1]);
    filePath = path.resolve(baseDir, filePath);
  }
  filePath = path.normalize(filePath);

  // keep track of all imported paths (use the scope)
  let paths = scope.__paths = scope.__paths || new Set();
  if (paths.has(filePath)) return null; // already imported

  // read the file contents
  try {
    var contents = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return [badFile(arg, filePath, e)];
  }

  // path was successfully imported
  paths.add(filePath);

  // parse
  let parser = new Parser({filePath});
  let nodes = parser.parse(contents);
  if (parser.errors.length > 0) return parser.errors;

  // analyze
  stack.push(filePath);
  let analyzer = new Analyzer(scope);
  nodes = analyzer.analyze(nodes);
  stack.pop();
  if (analyzer.errors.length > 0) return analyzer.errors;

  return nodes;
}

/////////////////////////////////////////////////////////////////////////////

$import.meta = {
  name: 'import',
  isMacro: true,
  params: [
    { name: 'file-path', validate: isString }
  ],
  desc: `
    Reads and executes the given commands file.
    @example
    (import "./my-command-definitions.cljs")`
};

/////////////////////////////////////////////////////////////////////////////

const isVar = arg => arg.type === 'variable';

function validate(node, root) {
  let errors = [];
  validatePosition(node, root, errors);
  validateFilePath(node, errors);
  return errors;
}

function validateFilePath(node, errors) {
  let arg = node.args[0];
  if (isVar(arg)) {
    errors.push(badVariable(node, arg));
  }
}

function validatePosition(node, root, errors) {
  if (node !== root) {
    errors.push(badPosition(node));
  }
}

/////////////////////////////////////////////////////////////////////////////

const badVariable = (node, arg) => {
  let param = $import.meta.params[0];
  return {
    type: 'error',
    loc: arg.loc,
    text: `Bad value ":${arg.name}" to "${node.name}" parameter 1 ("${param.name}"), must be ${param.validate.exp}`
  };
};

const badPosition = node => ({
  type: 'error',
  loc: node.loc,
  text: `"${node.name}" cannot be nested`
});

const badFile = (arg, filePath, e) => ({
  type: 'error',
  loc: arg.loc,
  text: `Error opening file "${filePath}"\n${e.message}`
});

/////////////////////////////////////////////////////////////////////////////

const commands = {import: $import};

/////////////////////////////////////////////////////////////////////////////

module.exports = {...commands, commands};

/////////////////////////////////////////////////////////////////////////////
