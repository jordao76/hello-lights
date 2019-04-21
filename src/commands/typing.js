/**
 * A function that implements a command.
 * @typedef {function} Command
 * @memberof commands
 * @param {object} ctx - Context to execute the command.
 * @param {commands.Cancellable} ctx.ct - A cancellation token.
 * @param {...object} [ctx....] - Extra context objects needed for the command,
 *   like the objects that the command manipulates.
 * @param {object[]} [args] - The command arguments all packed in an array.
 * @returns {object} Optionally the command can return any value. If meta.returns
 *   is set, the command <b>must</b> return a value that adheres to the meta.returns
 *   validation function.
 * @property {commands.Meta} meta - Metadata about the command.
 */

/**
 * Metadata about a command.
 * @typedef {object} Meta
 * @memberof commands
 * @property {string} name - Command name.
 * @property {string} desc - Command description.
 * @property {commands.Param[]} params - Parameter specification for the command.
 * @property {commands.Validate} [returns] - Return "specification" of the command.
 *   This validation function is never actually called, but it's used to check if
 *   the "return" of a command adheres to the parameter validation function of another.
 */

/**
 * Command parameter specification.
 * @typedef {object} Param
 * @memberof commands
 * @property {string} name - Parameter name.
 * @property {commands.Validate} validate - Parameter validation function.
 * @property {boolean} [isRest] - If the parameter is a rest parameter, i.e,
 *   it accepts a variable number of arguments (1 or more). A rest parameter
 *   <b>must</b> be the last parameter of a command.
 */

/**
 * A validation function for a command parameter.
 * Can also be used to indicate the return "specification" of a command.
 * @typedef {function} Validate
 * @memberof commands
 * @param {object} arg - Argument to validate.
 * @returns {boolean} If the validation succeeds or not.
 * @property {string} exp - The expected value for this validation function to
 *   succeed. Used in error messages.
 */
