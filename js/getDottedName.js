'use strict';

/*  Recombine dotted name of objrct expression
*  @left - object expression AST node for the left part of assignment expression.
*/
module.exports = function getDottedName(left){
    // return a name like ObjectNAme.property1.prop2.... from AST
    var str = '';

    if (left.type === 'Identifier') str = left.name;
    else nextPart(left);

    // change jQuery. object name to $.
    if (str.indexOf('jQuery') === 0)
        str = str.replace('jQuery', '$');

    return str;

    function nextPart(object){
        if (object.type === 'MemberExpression')
        {
            str = object.computed
                  ? object.property.type === 'Literal'
                    ? object.property.value
                    : '['+ (object.property.type === 'Identifier'
                            ? object.property.name
                            : object.property.type === 'MemberExpression'
                              ? getDottedName(object.property)
                              : 'uncaptured: '+ object.property.type ) +']'+ (str ? '.' + str : '')
                  : object.property.name + (str ? '.' + str : '');

            nextPart(object.object);
        }
        else
            str = (object.type === 'ThisExpression'
                   ? 'this'
                   : object.name) + '.' + str;
    }
};