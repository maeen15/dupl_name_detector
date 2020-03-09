'use strict';

const path = require('path');   // standard Node.js module for PATH management
const isItJquery = require( path.join(__dirname, "isItJquery.js"));
const scanBody = require( path.join(__dirname, "patternSearch.js"));
const buildNamesTree = require( path.join(__dirname, "buildNamesTree.js"));
const addToVocabular = require( path.join(__dirname, "addToVocabular.js"));
const createLocation = require( path.join(__dirname, "createLocation.js"));

module.exports = function findBody( tree, treeName, namesTree, parent ){
  
  if (!tree) return // error in a code

  let keys = Object.keys( tree );
  if (keys.length) {
    keys.forEach( key=>{

      if ( tree[key] && typeof tree[key] === 'object') {
        if (key === 'body') { 

          // check a start position of body -> add globals

        // for function expressions and function declarations
          if (tree.type === 'FunctionExpression' || tree.type === 'FunctionDeclaration'){
            if ( isItJquery(tree.body.body)) return; 

            let branch = { 
                            names: [], 
                            parent: namesTree 
                          };

            if (!namesTree.children) namesTree.children = []
            namesTree.children.push(branch)

            if (parent && parent.type === 'CallExpression' && parent.arguments.length) {
              parent.arguments.forEach( (arg, idx ) => {
                if (arg.type !== 'Identifier') return;
                if ((arg.name === 'jQuery' || arg.name === '$') && tree.params[idx]) branch.jq = tree.params[idx].name;
                if (arg.name === 'window' && tree.params[idx]) branch.w = tree.params[idx].name;
              })
            }

            if (tree.params.length){
              tree.params.forEach( (param)=>{
                branch.names.push({
                  body: tree.body.body,
                  name: param.name
                });
              })
            }
            //console.log('body f', tree);
            buildNamesTree(tree.body.body, branch); 
            scanBody(tree.body.body, treeName, branch);         
            findBody( tree.body.body, treeName, branch, tree );

          } else {
            if (isItJquery(tree.body)) return;
            //console.log('body n', tree.body);
            buildNamesTree(tree.body, namesTree );          
            scanBody(tree.body, treeName, namesTree);
            findBody( tree.body, treeName, namesTree, tree );
          
          }

        } else /*if (tree[key] instanceof Array && tree[key].length
            //&& !(key === 'properties' && tree.type === 'ObjectExpression' 
            && key !== 'params') {

            //console.log('array', key)
            if (key === 'properties' && tree.type === 'ObjectExpression') {}

            buildNamesTree(tree[key], namesTree);
            scanBody(tree[key], treeName, namesTree, tree);
            findBody( tree[key], treeName, namesTree, tree );          

        } else */{

          findBody( tree[key], treeName, namesTree, tree );
        }
      }
    });

    if (tree.type === 'CallExpression' && tree.callee.type === 'Identifier' && tree.callee.name === 'eval' && tree.arguments) {
            
      //if (!tree.arguments) return; // expecting just 1 argument

      //console.log('eval detected', tree.arguments.length, tree.arguments[0].type, tree.arguments[0].start)

      let loc = tree.arguments[0].loc;

      loc.start.pos = tree.arguments[0].start
      loc.end.pos = tree.arguments[0].end

      computed.push({
        file: treeName,
        eval: {
          type: tree.arguments[0].type,
          loc: loc
        }
      })
    }

    if (resolveConflict && tree.type === 'Identifier') {

      let type,
          loc = tree.loc;

      if (parent && parent.type === 'MemberExpression' && !parent.computed
          && (parent.object && parent.object.end !== tree.end) || parent.type === 'Property')
        type = 'property';
      else type = 'variable';

      addToVocabular(namesUsed, tree.name, type, treeName, createLocation(tree, parent), 'all');

      /*loc.start.pos = tree.start
      loc.end.pos = tree.end

      namesUsed.push({
        file: treeName,
        name: tree.name,
        type,
        loc 
      })*/
    }

  }   
}