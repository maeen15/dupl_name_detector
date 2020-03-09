'use strict';
/* Checks if script contains jQuery code  */

const {
    param
} = require("./globals.js");

module.exports = function isItJquery(body) {
    // exclude jQuery versions older than 1.1.4
    if (body instanceof Array && body.some(n =>
        (n.type === 'VariableDeclaration' && n.declarations.some(node =>
            node.id.name === 'jQuery'
        ))
    ))
    {
        // find jQuery version jQVersion
        let temp = body.filter(n => n.type === 'VariableDeclaration');

        if (temp.length)
        {
            temp = temp.find(n =>
                n.declarations.some(node =>
                    node.id.name === 'version' || node.id.name === 'core_version'
                )
            );
            if (temp)
            {
                temp = temp.declarations.find(n =>
                    n.id.name === 'version' || n.id.name === 'core_version'
                );
                if (temp) temp = temp.init.value;
            }
        }
        else
            temp = null;

        // if variable declaration "version" is not found -> it is jQuery version earlier than 2.0
        // use another pattern for the search
        if (!temp)
        {
            temp = body.find(n =>
                n.type === 'ExpressionStatement' &&
                n.expression.type === 'AssignmentExpression' &&
                n.expression.left.type === 'MemberExpression' &&
                n.expression.left.object.name === 'jQuery' &&
                n.expression.left.property.name === 'fn' &&
                n.expression.right.right && n.expression.right.right.type === 'ObjectExpression' &&
                n.expression.right.right.properties.some(node => node.key.name === 'jquery')
            );

            if (temp)
                temp = temp.expression.right.right.properties.find(n =>
                    n.key.name === 'jquery'
                ).value.value;
        }
        // what to do if jQVersion is already set?
        if (temp && param.jQVersion)
        {
            console.log('WARNING! Duplicated jQuery usage detected', temp);
            param.multipleJQueryFound = 1;
        }

        if (temp)
        {
            console.log('jQuery version loaded and detected is', temp);
            param.jQVersion = temp;
        }

        return true;
    }
    else
        return false;
}