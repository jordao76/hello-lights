# strips location information from a parse tree
class StripLocation

  process: (nodes) -> @recur node for node in nodes

  recur: (node) -> @[node.type] node

  command: (node) ->
    delete node.loc
    @recur arg for arg in node.args if node.args
    @recur param for param in node.params if node.params
    node

  value: (node) -> delete node.loc
  variable: (node) -> delete node.loc
  error: (node) -> delete node.loc
  param: (node) -> delete node.uses

module.exports = {StripLocation}
