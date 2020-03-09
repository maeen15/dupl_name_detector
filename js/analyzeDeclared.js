'use strict';
const path = require('path');
const addToVocabular = require( path.join(__dirname, "addToVocabular.js"));

module.exports = function analyzeDeclared(root, treeName){
  
  //console.log('scanning for undeclared' )

  let bodies = []  

  if (root.bodies) root.bodies.forEach(scan);
  if (root.children) root.children.forEach( (child)=>{
    analyzeDeclared(child, treeName)
  })

  function scan(body){
    if (bodies.some( (b)=>{ return b === body })) return;

    bodies.push(body);

    //console.log('scanning body', body.length)

    body.forEach( (n)=>{
      if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && 
        n.expression.left.type === 'Identifier' && isNotDeclared(root, n.expression.left.name)) {
        addToVocabular(vocabular, n.expression.left.name, 'auto', treeName, createLocation(n.expression.left));
      }
    })
  }
  function isNotDeclared(node, name){

    //console.log('isdeclared', name);

    if (node.names.some((nm)=>{
      return nm.name === name
    })) return false

    if (!node.parent) return true

    return isNotDeclared(node.parent, name)
  }

  function createLocation(node){
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
      }
    }
  }
}