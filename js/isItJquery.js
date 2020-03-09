'use strict';

module.exports = function isItJquery(body){
  if (body instanceof Array && body.some(function(n){
      /*return (n.type === 'FunctionDeclaration' && n.id.name === 'jQuery') || */
      // exclude jQuery versions older than 1.1.4
      return (n.type === 'VariableDeclaration' && n.declarations.some(function(node){
        return node.id.name === 'jQuery';
      }))
  })) {
    // find jQuery version jQVersion
    let temp = body.filter(function(n){
        return n.type === 'VariableDeclaration'
    });
    //console.log('declarations', temp)
    if (temp.length) {
      temp = temp.find(function(n){
           return n.declarations.some(function(node){
             return node.id.name === 'version' || node.id.name === 'core_version';
          })
        })
      if (temp) {
        //console.log('declaration', temp)
        temp = temp.declarations.find(function(n){
             return n.id.name === 'version' || n.id.name === 'core_version';
          })
        if (temp) temp = temp.init.value;
      }
    } else temp =  null

    // if variable declaration "version" is not found -> it is jQuery version earlier than 2.0
    // use another pattern for the search
    if (!temp) {
      temp = body.find(function(n){
            return n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && 
              n.expression.left.type === 'MemberExpression' && n.expression.left.object.name === 'jQuery' &&
              n.expression.left.property.name === 'fn' && n.expression.right.right && 
              n.expression.right.right.type === 'ObjectExpression' &&
              n.expression.right.right.properties.some(function(node){
                return node.key.name === 'jquery';
              })
        });
    //console.log('temp < 2.0', temp);
        if (temp) temp = temp.expression.right.right.properties.find(function(n){
                          return n.key.name === 'jquery'
                        }).value.value;
    }
    // what to do if jQVersion is already set?
    if (temp && jQVersion) {
      console.log('WARNING! Duplicated jQuery usage detected', temp);
      multipleJQueryFound = 1;
    }
    if (temp) {
      console.log('jQuery version loaded and detected is', temp)
      jQVersion = temp;
    } //else findBody(body);

    return true;
  } else return false;
}