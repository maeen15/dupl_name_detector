'use strict';

/* Creates location object for dictionary record
 *  @node - AST node
 *  @parent - AST parent node
 */

module.exports = function createLocation(node, parent) {
    let n = (parent && (parent.type === 'CallExpression' || parent.type === 'VariableDeclarator') && node.type === 'MemberExpression')
        ? parent
        : node;

    return {
        start: {
            line: n.loc.start.line,
            column: n.loc.start.column,
            pos: n.start
        },
        end: {
            line: n.loc.end.line,
            column: n.loc.end.column,
            pos: n.end
        },
        type: parent
            ? parent.type
            : null
    };
};
