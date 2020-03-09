'use strict';

module.exports = function isJqueryObject(left, names){ //names is an Array of possible jQuery aliases

   return left.type === 'Identifier' ?  
   				
   				names.indexOf(left.name) !== -1 :

   				(left.object.type === 'MemberExpression' ? 

       				isJqueryObject(left.object, names) :

       				(left.object.type === 'Identifier' && names.indexOf(left.object.name) !== -1)
       			)

}