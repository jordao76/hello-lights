let {published} = require('./commands');
let {Cancellable} = require('./cancellable');
let parser = require('./command-peg-parser');

//////////////////////////////////////////////////////////////////////////////

let isVar = (a) => typeof a === 'string' && a.startsWith(':');
let getName = (v) => v.replace(/^:/, '');

class Vars {
  constructor(args) {
    this.args = args;
  }
  resolve(scope) {
    return this.args.map(a =>
      isVar(a) ? scope[getName(a)] : a
    );
  }
}

//////////////////////////////////////////////////////////////////////////////

class CommandParser {

  constructor(commands = published) {
    this.commands = commands;
    this.ct = new Cancellable;
  }

  get commandList() {
    return Object.keys(this.commands);
  }

  cancel(ct = this.ct) {
    if (ct.isCancelled) return;
    ct.cancel();
    if (ct === this.ct) {
      this.ct = new Cancellable;
    }
  }

  execute(commandStr, tl, ct = this.ct, scope = {}) {
    if (ct.isCancelled) return;
    var command = this.parse(commandStr);
    return command({tl, ct, scope}); // no await
  }

  parse(commandStr) {
    let commandAst = parser.parse(commandStr);
    let interpreter = new Interpreter(this);
    return interpreter.interpret(commandAst);
  }

  define(name, command) {
    if (this.commands[name]) throw new Error(`Command "${name}" already exists`);
    let paramNames = command.paramNames || [];
    let newCommand = ({tl, ct, scope = {}}, params = []) => {
      Validator.validate(newCommand, params);
      params.forEach((p, i) => scope[paramNames[i]] = p);
      return command({tl, ct, scope});
    };
    newCommand.title = name;
    newCommand.paramNames = paramNames;
    return this.commands[name] = newCommand;
  }

}

//////////////////////////////////////////////////////////////////////////////

class Interpreter {

  constructor(parser) {
    this.parser = parser;
    this.commands = parser.commands;
  }

  interpret(ast) {
    this.variables = [];
    return this.recur(ast);
  }

  recur(node) {
    return this[node.type](node);
  }

  command(node) {
    // get the command components: its name and its arguments
    let commandName = node.name;
    let args = node.params;

    // get the command and check that it's valid
    let command = this.commands[commandName];
    if (!command) throw new Error(`Command not found: "${commandName}"`);

    // recurse on parameters
    args = args.map(a => this.recur(a));

    // transform the command arguments
    args = this._transform(command, args);

    // validate the command arguments
    Validator.validate(command, args);

    // return a command that takes (in an object) a traffic light (tl),
    // a cancellation token (ct) and an optional scope with variable bindings
    let vars = new Vars(args);
    let res = ({tl, ct, scope={}}) => {
      let ctx = {tl, ct, scope};
      if (command.usesParser) ctx.cp = this.parser; // cp = command-parser
      let params = vars.resolve(scope);
      Validator.validate(command, params);
      return command(ctx, params);
    };
    // note: these are ALL the variables collected so far,
    // not only the ones relevant for this command
    // e.g. (run (toggle :l1) (pause :ms) (toggle :l2))
    //   'pause' will have [l1, ms]
    //   the second 'toggle' will have [l1, ms, l2]
    res.paramNames = this.variables; // variables become parameter names
    return res;
  }

  variable(node) {
    if (this.variables.indexOf(node.name) < 0) {
      this.variables.push(node.name);
    }
    return ':' + node.name;
  }

  value(node) {
    return node.value;
  }

  _transform(command, args) {
    if (command.transformation) {
      return command.transformation(args);
    }
    return args;
  }

};

//////////////////////////////////////////////////////////////////////////////

let Validator = {

  validate(command, args) {
    let res = this.execute(command, args);
    if (res.hasErrors) {
      throw new Error(res.errorStr);
    }
  },

  execute(command, args) {
    let es = this._collectErrors(command, args);
    return {
      isValid: es.length === 0,
      hasErrors: es.length > 0,
      errors: es,
      errorStr: es.join('\n')
    };
  },

  _collectErrors(command, args) {
    let badArity = (exp, act) =>
      `Bad number of arguments to "${commandName}"; it takes ${exp} but was given ${act}`;
    let badValue = (i) =>
      `Bad value "${args[i]}" to "${commandName}" parameter ${i+1} ("${pns[i]}"); must be: ${vfs[i].exp}`;
    let commandName = command.title || command.name;
    let pns = command.paramNames; // pns = Parameter NameS
    if (pns.length !== args.length) return [badArity(pns.length, args.length)];
    let vfs = command.validation || []; // vfs = Validation FunctionS
    // return all errors
    return vfs
      .map((isValid, i) => isVar(args[i]) || isValid(args[i]) ? null : badValue(i))
      .filter(e => e); // filter out 'null', where the validation was successful
  }

}

module.exports = {CommandParser};
