'use strict';
const path = require('path');
const addToVocabular = require( path.join(__dirname, "addToVocabular.js"));

const {
    vocabular
} = require("./globals.js");

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
    };
}

function isNotDeclared(node, name){
    return node.names.some(nm => nm.name === name && nm.type !== 'assignee')
           ? false
           : node.parent
             ? isNotDeclared(node.parent, name)
             : true;
}

module.exports = function analyzeDeclared(root, treeName){
    let bodies = [],
        scan = body => {
            // do not repeat on the same body
            if (!bodies.some(b => b === body))
            {
                bodies.push(body);
                body.forEach(goForIdentifier);
                /*body.forEach(n => {
                    if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' &&
                        n.expression.left.type === 'Identifier' && isNotDeclared(root, n.expression.left.name))
                        addToVocabular(vocabular, n.expression.left.name, 'auto', treeName, createLocation(n.expression.left));
                });*/
            }
        };

    function goForIdentifier(n) {
        let inScope = n.left && n.type !== 'MemberExpression' && n.type !== 'VariableDeclarator';

        for (let key in n){
            let v = n[key];

            if ( v && n.hasOwnProperty(key) && typeof v === 'object')
            {
                if (v.type === 'Identifier' && inScope && isNotDeclared(root, v.name))
                {
                    /*console.log(v.name, v.type, inScope,
                        {
                            bodies: root.bodies.length,
                            names: root.names && root.names.length,
                            children: root.children && root.children.length
                        },
                        v.loc.start);*/
                    addToVocabular(vocabular, v.name, 'auto', treeName, createLocation(v));
                }

                else if (key !== 'body')
                    goForIdentifier(v);
            }
        }
    }

    if (root.bodies)
        root.bodies.forEach(scan);

    if (root.children)
        root.children.forEach(child => analyzeDeclared(child, treeName));
};