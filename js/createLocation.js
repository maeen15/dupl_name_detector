'use strict';

module.exports = function createLocation(node, parent){

  if (parent) {
    //console.log('loc:', node.loc.start.line, node.type, parent.type)
    if ((parent.type === 'CallExpression' || parent.type === 'VariableDeclarator') &&  node.type === 'MemberExpression')
      node = parent;
  }

  return {
    start: {
      line: node.loc.start.line,
      column: node.loc.start.column,
      pos: node.start
    },
    end: {
      line: node.loc.end.line,
      column: node.loc.end.column,
      pos: node.end
    },
    type: parent ? parent.type : null
  }
}
