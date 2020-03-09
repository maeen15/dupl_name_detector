'use strict';

/* Checks if object expression is a known jQuery aliases
* @left - AST node of object expression
* @names is an Array of possible jQuery aliases
*/

module.exports = function isJqueryObject(left, names){
    return left.type === 'Identifier'
           ? names.indexOf(left.name) !== -1
           : (left.object.type === 'MemberExpression'
              ? isJqueryObject(left.object, names)
              : (left.object.type === 'Identifier' && names.indexOf(left.object.name) !== -1)
           );
};