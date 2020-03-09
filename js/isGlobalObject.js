'use strict';

module.exports = function isGlobalObject(left, names){
  return (left.object.type === 'MemberExpression' && !left.object.computed)
         ? isGlobalObject(left.object, names)
         : (left.object.type === 'Identifier' && names.indexOf(left.object.name) !== -1);
};