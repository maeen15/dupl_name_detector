'use strict'      // instruction for code compiler how to use the code, for eg, 
                  // this line used to reduce possible error

const path = require('path');   // standard Node.js module for PATH management
//const fs = require('fs');     // standard Node.js module for file operations

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(express.static('public'));
app.listen(3000);

// some global app variables
global.testmode = false;
global.staticOnlyMode = false;
global.scanDomChanges = false;
global.resolveConflict = false;
global.jQVersion = ''; // if jQuery file found use this variable to store it's version
global.multipleJQueryFound = false; // true if more than single jQuery library detected  
global.declaredNames = [];
global.variables = []; // not window and jQuery names used in left part of assignments
global.functions = []; // reserved
global.classes = [];   // reserved
global.computed = [];  // for computed properties
global.namesUsed = new Map(); // used variables and property names
global.vocabular = new Map();    // list of all global variables, functions and javascript classes
global.jqueryFn = new Map();     // list of JQuery methods
global.memberexpr = new Map();     // list of member expressions
global.patternsAnalyzed = 0;
// badWords contains unwanted names like browser objects and reserved JavaScript words
global.badWords = ['document.', '.style', '.css', 'element.', 'table.', '.innerHTML', 'options.', 'module.exports', 'width', 'height'];
global.goodWords = ['.w.', '.win', '.prototype', '.window', 'args[', 'arguments']; // estimation for analysis

global.Browser = require( path.join(__dirname,"js/runPage.js")); // 

// command manager runs processes
const manager = require( path.join(__dirname,"js/commandManager.js"));

manager(app);

/*Browser.testPage('jquery.lettering' + '/' + 'index.html', res => {
  console.log('page res:', res);
});*/

