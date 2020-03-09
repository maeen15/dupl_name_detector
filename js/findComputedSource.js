'use strict';

const {
    notANode
} = require("./globals.js");

/*function createBkTree(rec, acc){
    let inArr = !!rec.prev;
    return rec.parent
           ? createBkTree(rec.parent, `${acc} ${inArr ? '[' : ''}${rec.type || '--'}${inArr ? ']' : ''}`)
           : `${acc} ${inArr ? '[' : ''}${rec.type || '--'}${inArr ? ']' : ''}`;
}*/

/* check if name is on the left side in assignment expression or var initialization
*  first check upper neighbours
*  then check if variable is declared in current scope.
*  If not not assigned in neighbors (including local function calls)
*  and not declared locally
*  check assignment at parent expression
*/
let patterns = [
    {
        type: 'VariableDeclarator',
        path: ['id', 'name'],
        value: 'init'
    },
    {
        type: 'AssignmentExpression',
        path: ['left', 'name'],
        value: 'right'
    }
    /*,
    {
        type: 'ExpressionStatement',
        path: [{expression: 'AssignmentExpression'}, 'left', 'name'],
        value: 'right'
    }*/
    /*,
    {
        type: 'ExpressionStatement',
        path: [{expression: 'CallExpression'}],
        value: 'callee'
    }*/
    /*,
    {
        type: 'ForInStatement'
    }*/
];

function getObjPath(node, objPath, idx = 0) {
    let next = objPath[idx]
               ? node[objPath[idx]]
               : null;

    return next && idx < objPath.length - 1
           ? getObjPath(next, objPath,idx + 1)
           : next;
}

function checkPatterns(name, literal, node, wasDeclared, accumulator) {
    let found, pattern, assignedValue,
        {isDeclaredInScope} = checkDeclarations(node, name);

    //console.log('ch', !!node.prev, node.type, node.loc && node.loc.start.line);

    if (!(node instanceof Array))
        pattern = patterns.find(p => p.type === node.type && getObjPath(node, p.path) === name);

    if (pattern)
    {
        found = node;
        assignedValue = pattern.value;
        accumulator.push(node)
    }
    else
    {
        let entries = Object.entries(node);

        while (entries.length){
            let [key, value] = entries.pop();
            if (value && !notANode.has(key))
            {
                if (typeof value === "object")
                {
                    pattern = checkPatterns(name, literal, value, accumulator);
                    if (pattern.found)
                    {
                        found = pattern.found;
                        assignedValue = pattern.assignedValue;
                        entries.length = 0;  // break while
                    }

                    if (pattern.isDeclaredInScope)
                        isDeclaredInScope = pattern.isDeclaredInScope;
                }
            }
        }
    }

    return {found, isDeclaredInScope, assignedValue};
}

function checkDeclarations(node, name) {
    //console.log('decl for', name);
    let isDeclaredInScope = (node.type === 'VariableDeclarator' && node.id.name === name ||
        ((node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') &&
            node.params.some(p => p.type === 'Identifier' && p.name === name)));

    return {isDeclaredInScope}
}

function findValueAssignment(name, literal, node, toParent, wasDeclared, accumulator = []) {
    console.log('fnd', !!node.prev, node.type, node.loc && node.loc.start.line);

    let {found, isDeclaredInScope, assignedValue} = toParent
            ? checkDeclarations(node, name)
            : checkPatterns(name, literal, node, wasDeclared, accumulator);

    if (!wasDeclared && isDeclaredInScope)
        wasDeclared = isDeclaredInScope;

    if (!found)
    {
        if(node.prev)
            found = findValueAssignment(name, literal, node.prev, false, wasDeclared, accumulator);

        else if (!wasDeclared && node.parent)
            found = findValueAssignment(name, literal, node.parent, true, wasDeclared, accumulator);

        assignedValue = found.assignedValue;
        found = found.found;
    }

    return {found, assignedValue};
}

module.exports = function findComputedSource(property, node) {
    let acc = [], {found, assignedValue} = findValueAssignment(
        property.name,
        property.value && property.value[0],
        node.prev || node.parent,
        !node.prev,
        false,
        acc
    );

    console.log('computed', property,
        // createBkTree(rec.expr, ''),
        found.type, found.loc,
        assignedValue, assignedValue && found[assignedValue],
        '\n'
    );
};