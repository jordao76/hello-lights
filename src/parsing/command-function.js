/**
 * A function that implements a command.
 * @typedef {function} CommandFunction
 * @memberof parsing
 * @param {object} ctx - Context to execute the command.
 * @param {parsing.Cancellable} ctx.ct - A cancellation token.
 * @param {object} ctx.scope - Variable bindings for nested commands.
 * @param {...object} [ctx....] - Extra context objects needed for the command,
 *   like the objects that the command manipulates.
 * @param {object[]} [params] - The command parameters.
 * @property {object} doc - Name and description of the command.
 * @property {string} doc.name - Command name.
 * @property {string} doc.desc - Command description.
 * @property {function} [transformation] - Transforms the parameters of the command.
 * @property {string[]} [paramNames] - Parameter names for the command.
 * @property {function[]} [validation] - Validation functions for each parameter
 *   after transformation.
 */
