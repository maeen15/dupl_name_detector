'use strict';

module.exports = function buildNamesTree(body, tree){
    let makeRecord = d => ({
        body: body,
        name: d.id.name
    });
    // !body -> error in a code
    if (!body || !body.length) return;

    if (!tree.bodies) tree.bodies = [];
    tree.bodies.push(body);

    // suppose declarations have block scope
    body.forEach(n => {
        switch (n.type){
            case 'FunctionDeclaration':
                // if AST chain for "function name() {}" found
                tree.names.push(makeRecord(n));
                break;

            case 'VariableDeclaration':
                // if AST chain for "var name1, name2 ...;" found, store each variable name in a list
                n.declarations.forEach(d => tree.names.push(makeRecord(d)));
                break;

            case 'ClassDeclaration':
                // if AST chain for "class name {}" found
                tree.names.push(makeRecord(n));
                break;

            default: goForDeclataions(n)
        }
    });

    function goForDeclataions(n) {
        for (let key in n)
            if ( n.hasOwnProperty(key) && n[key] && typeof n[key] === 'object')
            {
                if (n[key].type === 'VariableDeclaration')
                    n[key].declarations.forEach(d => tree.names.push(makeRecord(d)));
                else if (key !== 'body')
                    goForDeclataions(n[key]);
            }
    }
};
