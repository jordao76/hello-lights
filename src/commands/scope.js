/////////////////////////////////////////////////////////////////////////////

/**
 * A flat (non-hierarchical) scope for commands.
 * @memberof commands
 * @private
 */
class FlatScope {

  /**
   * @param {object.<string, commands.Command>} [commands] - Commands for this scope.
   */
  constructor(commands = {}) {
    this.commands = commands;
  }

  /**
   * Command names in this scope.
   * @type {string[]}
   */
  get commandNames() {
    return Object.keys(this.commands);
  }

  /**
   * Adds a new command or redefines an existing one.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function.
   */
  add(name, command) {
    this.commands[name] = command;
  }

  /**
   * Looks up a command in this scope.
   * @param {string} name - The command name.
   * @param {commands.Command} command - The command function or `null` if the command is not found.
   */
  lookup(name) {
    return this.commands[name];
  }

}

/////////////////////////////////////////////////////////////////////////////

module.exports = {FlatScope};
