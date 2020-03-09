'use strict';

const path = require('path');
const isJqueryObject = require( path.join(__dirname, "isJqueryObject.js"));
const getDottedName = require( path.join(__dirname, "getDottedName.js"));
const isGlobalObject = require( path.join(__dirname, "isGlobalObject.js"));
const addToVocabular = require( path.join(__dirname, "addToVocabular.js"));
const createLocation = require( path.join(__dirname, "createLocation.js"));

module.exports = function scanBody( body, treeName, namesTree, parent_old, mode ){ 

  // traversing AST tree and look for known statements chain
  // chains can be observed at https://astexplorer.net/, just copy desired expression to the left part.

  let globals;

  function traversAssignment(n, statement){

    // collect names to catch a value here

    // do we need analyse jQuery obj as well?

    // how to inject? 
    //  1) inject a string into a code
    //  2) inject a new node in AST => reconstruct a code

    // can we process dynamic phase in 1 turn?

    if (n.left.type === 'MemberExpression'){

      var dottedName = getDottedName(n.left);

        if (isJqueryObject(n.left, globals.jq)) {

          if (!isComputed(n, 'jQuery', dottedName)) 
            addToVoc(jqueryFn, dottedName, 'jQuery', n.left, 'Assignment', statement);

        } else if (isGlobalObject(n.left, globals.w)) {

          if (!isComputed(n, 'window', dottedName)) 
            addToVoc(vocabular, dottedName, 'global', n.left, 'Assignment', statement);

        } else {
          // object is not a jQuery and not a window => take parent object and collect for injection
          // store node position in the body

          //console.log('not JQ', statement)

          //if (!isComputed(n.left, '', dottedName)) {
            isComputed(n, '', dottedName)
            addToVoc(memberexpr, dottedName, 'object', n.left, 'Assignment', statement);

          //} else {
            // computed and member expression

          //}
        }
      }

    //if (n.right.type === 'AssignmentExpression') traversAssignment(n.right, statement);
  }

  function collectGlobals(namesTree, key, res){
    if (namesTree[key]) res.push(namesTree[key]);
    if (namesTree.parent) return collectGlobals(namesTree.parent, key, res);
    return res;
  }

  function checkForPattern(n, parent){

   // if (parent) console.log('check', n.type, parent.type);

    patternsAnalyzed++;

    // each element has a type property, and here is the point of chain finding
    switch (n.type){

      case 'AssignmentExpression': traversAssignment(n, parent);  
          break;

      case 'CallExpression': 

          if( n.callee.type === 'MemberExpression' &&
            n.callee.object.name === 'Object') {

            //Object.defineProperties(jquery, object )
            //Object.defineProperty(jquery, 'name', value)
            //Object.assign(target, obj1,... objn);

            let args = n.arguments,
                first = args[0];

            if (n.callee.property.name === 'defineProperty' && args.length &&
             isJqueryObject(first, globals.jq)) {

              // when second argument is not a literal -> variable used -> case for dynamic value capturing. TODO

                if (args[1] && args[1].type === 'Literal') 
                  addToVoc( jqueryFn, 
                          getDottedName(first) + '.' + args[1].value, 
                          'jQuery', 
                          first,
                          'defineProperty'
                        );

            } else if (n.callee.property.name === 'defineProperties' && args.length > 1 &&
             isJqueryObject(first, globals.jq)) {

              // when second argument is not a ObjectExpression -> variable used -> case for dynamic value capturing. TODO

                if (args[1].type === 'ObjectExpression')
                  args[1].properties.forEach( p => {
                    addToVoc( jqueryFn, 
                          getDottedName(first) + '.' + p.key.name, 
                          'jQuery', 
                          first,
                          'defineProperties'
                        );
                  })


            } else if (n.callee.property.name === 'assign' && args.length > 1 &&
             isJqueryObject(first, globals.jq)) {

                args
                  .filter( arg => {
                    return arg.type === 'ObjectExpression' && arg.properties.length
                  })
                  .forEach(arg => {
                    arg.properties.forEach( p => {
                      addToVoc( jqueryFn, 
                            getDottedName(first) + '.' + p.key.name, 
                            'jQuery', 
                            first,
                            'Object.assign'
                          );
                    })
                  })
            }
          }  

          /*
            this condition looks for a chain of AST equal to
            JQuery or $.fn.extend({ name: ... })
          */
          else if (n.callee.type === 'MemberExpression' &&
            n.callee.property && n.callee.property.name === 'extend' && 
            n.callee.object && n.callee.object.property && 
            n.callee.object.property.name === 'fn' &&
            n.arguments.length && n.arguments[0].type === 'ObjectExpression'){

            // if $.fn.extend({ name: ... }) found, 
            //add each name of object-argument properties to JQuery vocabulary as method or property
            n.arguments[0].properties.forEach( (p) => { 
              addToVoc(jqueryFn, '$.fn.'+(p.key.name || p.key.value), 'property', n, '$.fn.extend');
            });
          } 
          else if (n.callee.type === 'MemberExpression' && 
            n.callee.property && n.callee.property.name === 'extend' && 
            n.callee.object && (n.callee.object.name === 'jQuery' || n.callee.object.name === '$') && 
            n.arguments.length && n.arguments[0].type === 'ObjectExpression'){ 

              n.arguments[0].properties.forEach( (p) => { 
                addToVoc(jqueryFn, '$.'+(p.key.name || p.key.value), 'property', n, '$.extend');
              });
          }

          /*
            this condition looks for a chain of AST equal to
            JQuery or $.method_name = ({ [rpperty name1" " namex1", name2="namez2, ...}
          */
          /*else if (n.callee.type === 'MemberExpression' &&
                  (n.callee.object.name === 'jQuery' || n.callee.object.name === '$') && 
                  n.callee.property && n.callee.property.name === 'each' &&
                  n.arguments[0].type === 'ArrayExpression' && 
                  n.arguments[1].type === 'FunctionExpression' &&
                  n.arguments[1].params[1] &&
                  n.arguments[1].body.body.some(function(entry){
                    return entry.type === 'ExpressionStatement' && 
                    entry.expression && entry.expression.type === 'AssignmentExpression' &&
                    entry.expression.left.type === 'MemberExpression' && entry.expression.left.computed &&
                    entry.expression.left.object.type === 'MemberExpression' &&
                    (entry.expression.left.object.object.name === 'jQuery' || entry.expression.left.object.object.name === '$') && 
                    entry.expression.left.object.property && entry.expression.left.object.property.name === 'fn' &&
                    entry.expression.left.property.name === n.expression.arguments[1].params[1].name
                  })
                  ){
                  //console.log('log',n.expression.arguments[0]);
                  n.arguments[0].elements.forEach( (p) => { 
                    addToVoc(jqueryFn, '$.fn.'+p.value, 'method', p, 'each');
                  });
          }*/
        break;

    }    

    let keys = Object.keys( n );
        if (keys.length) 
          keys.forEach( key => {
            if (key !== 'body' && n[key] && typeof n[key] === 'object') 
              checkForPattern(n[key], 
                (n[key] instanceof Array || n.type === 'VariableDeclarator'
                    ? n 
                    : (parent || n[key]))
                )
          });
  }


  // return if tree is empty
   // !body -> error in a code
  if ( !body || !treeName || !body.length ) return;  

  //if ( isItJquery(body)) return;

  //patternsAnalyzed += body.length;

  // if JQuery module structure detected
  if ( mode !== 'global') {

      globals = {
        w: collectGlobals(namesTree, 'w', []),
        jq: collectGlobals(namesTree, 'jq', ['$'])
      };

      // Each tree root element has a body, which is an array of declatarion or statements
      // And each element in the body needs to be inspected:
      body.forEach(expr => {
         checkForPattern(expr, expr);
      });

  }
  // if Global mode
  else {
    body.forEach( (n, index) => {
        //console.log('first');
        
        // same as for JQuery mode
        switch (n.type){
          case 'FunctionDeclaration': 
            // if AST chain for "function name() {}" found
            addToVoc(vocabular, n.id.name, 'function', n.id);
            break;
  
          case 'VariableDeclaration': 
            // if AST chain for "var name1, name2 ...;" found, store each variable name in a list
            n.declarations.forEach( (d) =>{ addToVoc(vocabular, d.id.name, 'var', d.id); } );
            break;  
  
          case 'ClassDeclaration': 
            // if AST chain for "class name {}" found
            addToVoc(vocabular, n.id.name, 'class', n.id);
            break;
  
          case 'ExpressionStatement':
              /*
                this condition looks for a chain of AST equal to autorun function:
                (function(...){ ...})(...);
              */
              //console.log('expression', n.expression.type, n.expression.callee.type);
              /*if (n.expression.type === 'CallExpression' && n.expression.callee.type === 'FunctionExpression' &&
                n.expression.arguments.length) {

                n.expression.arguments.forEach( (arg, idx ) => {
                  if (arg.type !== 'Identifier') return;
                  //if (arg.name === 'jQuery' || arg.name === '$') globals.jq = n.expression.callee.params[idx].name;
                  //if (arg.name === 'window') globals.w = n.expression.callee.params[idx].name;
                })
              } */
  
            break;
        }
      });

    return;
  }

  // parent is from module params
  function addToVoc(voc, name, type, node, pattern, parent){
    addToVocabular(voc, name, type, treeName, createLocation(node, parent), pattern);
  }

  function isComputed(node, type, dottedName){
    let c = false,
        expr = node.left,
        acc = [];    // stores splitted object expressios as parts of object members.

    nextPart(expr);

    if (c) computed.push({
                    file: treeName,
                    name: dottedName,
                    nodeStart: node.start,
                    accName: acc
                  });

    return c;

    function nextPart(object){

      if (object.type === 'MemberExpression') {

        let loc = createLocation(object.property); //object.property.loc;

        //loc.start.pos = object.property.start
        //loc.end.pos = object.property.end

        if (object.computed && object.property.type !== 'Literal') {
          c = true;
          acc.push({
                      name: object.property.type === 'Identifier' 
                              ? object.property.name 
                              : object.property.type === 'MemberExpression' 
                                  ? getDottedName(object.property)
                                  : 'uncaptured: '+ object.property.type, 
                  // some properies may be not an Identifier -> real expression should be obtained from a file
                      computed: true,
                      loc: loc
                    });
        } else 
           acc.push({
                      name: object.property.name || object.property.value,
                      computed: false,
                      literal: true,
                      loc: loc
                    });

        nextPart(object.object)

      } else  {        // supposing Identifier

        let loc = createLocation(object) //object.loc;

        //loc.start.pos = object.start
        //loc.end.pos = object.end
        acc.push({
                  name: object.name 
                          ? object.name 
                          : object.type === 'ThisExpression' 
                              ? 'this' 
                              : 'uncaptured: '+ object.type,         // should be $ or jQuery
                  computed: false,
                  loc: loc
                });
      }
    }
  }
}