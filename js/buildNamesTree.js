'use strict';

module.exports = function buildNamesTree(body, tree, parent){
  // !body -> error in a code
  if (!body || !body.length) return;

  if (!tree.bodies) tree.bodies = [];
  tree.bodies.push(body);
  //tree.names = []; // object: { name: 'xxx', body: ...(pointer) }
  //tree.parent = parent;

  body.forEach( (n) => {
      switch (n.type){
        case 'FunctionDeclaration': 
          // if AST chain for "function name() {}" found
          tree.names.push({
            body: body,
            name: n.id.name
          });
          break;

        case 'VariableDeclaration': 
          // if AST chain for "var name1, name2 ...;" found, store each variable name in a list
          n.declarations.forEach( (d) =>{ 
              tree.names.push({
                body: body,
                name: d.id.name
              });
           });
          break;

        /*
        case 'VariableDeclarator':
            tree.names.push({
                body: body,
                name: n.id.name
              });
          break */   

        case 'ClassDeclaration': 
          // if AST chain for "class name {}" found
          tree.names.push({
            body: body,
            name: n.id.name
          });
          break;
      }
  })
}
