'use strict';

const path = require('path');

if (!global.globals)
    global.globals = (() => {
        return {
            // constants
            badWords: ['document.', '.style', '.css', 'self.', 'element.', 'table.', '.innerHTML', 'options.', 'module.exports', 'width', 'height'],
            goodWords: ['.w.', '.win', '.prototype', '.window', 'args[', 'arguments'],
            publicFolder: path.join(__dirname, '..', 'public'),
            inputFolder: path.join(__dirname, '..', 'input'),
            outputFolder: path.join(__dirname, '..', 'output'),
            dataFolder: path.join(__dirname, '..', 'data'),

            // variables
            param: {
                testmode: false,
                staticOnlyMode: false,
                scanDomChanges: false,
                resolveConflict: false,
                jQVersion: '',
                multipleJQueryFound: false,
                patternsAnalyzed: 0
            },

            // buffers
            declaredNames: [],
            // ???? variables: [], // not window and jQuery names used in left part of assignments
            functions: [], // reserved
            classes: [],   // reserved
            computed: [],  // for computed properties
            namesUsed: new Map(), // used variables and property names
            vocabular: new Map(),    // list of all global variables, functions and javascript classes
            jqueryFn: new Map(),     // list of JQuery methods
            memberexpr: new Map()     // list of member expressions
        };
    })();

module.exports = global.globals;