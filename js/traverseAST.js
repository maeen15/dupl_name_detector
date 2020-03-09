'use strict';

const isItJquery = require("./isItJquery.js");
const scanBody = require("./patternSearch.js");
const buildNamesTree = require("./buildNamesTree.js");
const addToVocabular = require("./addToVocabular.js");
const createLocation = require("./createLocation.js");

const {
        param,
        computed,
        namesUsed
    } = require("./globals.js");

/* recursive function to find a 'body' tag in AST nodes and scan it for variables used
* @tree - Object to scan (AST node)
* @treeName - filename
* @namesTree - branch of names collector
* @parent - parent AST object
*/
module.exports = function findBody( tree, treeName, namesTree, parent ){

    if (!tree) return; // error in a code

    for (let key in tree)
        if ( tree[key] && typeof tree[key] === 'object')
        {
            if (key === 'body')
            {
                // check a start position of body -> add globals

                // for function expressions and function declarations
                if (tree.type === 'FunctionExpression' || tree.type === 'FunctionDeclaration')
                {
                    if ( isItJquery(tree.body.body)) return;

                    let branch = {
                        names: [],
                        parent: namesTree
                    };

                    if (!namesTree.children) namesTree.children = [];
                    namesTree.children.push(branch);

                    // check if function call has jQuery or window in arguments
                    if (parent && parent.type === 'CallExpression' && parent.arguments.length)
                        parent.arguments.forEach((arg, idx) => {
                            if (arg.type === 'Identifier')
                            {
                                if ((arg.name === 'jQuery' || arg.name === '$') && tree.params[idx])
                                    branch.jq = tree.params[idx].name;

                                if (arg.name === 'window' && tree.params[idx])
                                    branch.w = tree.params[idx].name;
                            }
                        });

                    // function parameters become local variables -> add them to names scope
                    if (tree.params.length)
                        tree.params.forEach(param =>
                            branch.names.push({
                                body: tree.body.body,
                                name: param.name
                            })
                        );

                    buildNamesTree(tree.body.body, branch);
                    scanBody(tree.body.body, treeName, branch);
                    findBody( tree.body.body, treeName, branch, tree );

                }
                else
                {
                    if (isItJquery(tree.body)) return;

                    buildNamesTree(tree.body, namesTree );
                    scanBody(tree.body, treeName, namesTree);
                    findBody( tree.body, treeName, namesTree, tree );
                }
            }
            else
                findBody( tree[key], treeName, namesTree, tree );
        }

    //catch 'eval' expressions
    if (tree.type === 'CallExpression' && tree.callee.type === 'Identifier' &&
        tree.callee.name === 'eval' && tree.arguments)
    {
        let loc = tree.arguments[0].loc;

        loc.start.pos = tree.arguments[0].start;
        loc.end.pos = tree.arguments[0].end;

        computed.push({
            file: treeName,
            eval: {
                type: tree.arguments[0].type,
                loc: loc
            }
        });
    }

    if (param.resolveConflict && tree.type === 'Identifier')
    {
        let type = (parent && parent.type === 'MemberExpression' && !parent.computed
            && (parent.object && parent.object.end !== tree.end) || parent.type === 'Property')
            ? 'property'
            : 'variable';

        addToVocabular(namesUsed, tree.name, type, treeName, createLocation(tree, parent), 'all');
    }

};