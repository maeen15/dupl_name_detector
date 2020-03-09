'use strict';

const path = require('path');   // standard Node.js module for PATH management
const fs = require('fs');     // standard Node.js module for file operations

const jsdom = require("jsdom");  // Node.js module for HTML documents loading and working with
const { JSDOM } = jsdom;
//const ast = require( path.join(__dirname,"acorn/dist/acorn.js"));  // AST module
const ast = require( path.join(__dirname,"acorn/dist/acorn_loose.js"));  // error-tolerant AST module
const recursive = require('recursive-readdir'); // Node.js module for directory scanning

const scanBody = require( path.join(__dirname, "patternSearch.js"));// it looks for the targeted patterns

const findBody = require( path.join(__dirname, "traverseAST.js"));  // analyze every node on the tree to find name "body" by walking through each node 
const analyzeDeclared = require( path.join(__dirname, "analyzeDeclared.js")); // analyze the declaration of the collected names, mainly find the list of un declared names and considered as global names by default
const finalize = require( path.join(__dirname, "finalize.js")); // 1. prepare the results for output, and write the text and json files, and
                                                                // 2. lunches dynamic analysis though intercepting the values that couldn't analyzed statically 
                                                                // 3. prepare the injection code, by inserting these code in certain positions in the targeted plugin files
                                                                // 
const analyzeNames = require( path.join(__dirname, "analyzeNames.js")); // analyze the DOM conlifct
const analyzeCSS = require( path.join(__dirname, "analyzeCSS.js")); // analyze the CSS conlifct

let files,  // list of files found for tests
    testDir,  // folder to test
    indexOfNames = 0,
    scannedFiles = new Map(); // list of all scanned files

module.exports = function(app){

  app.post('/api', (req, res) => {

    res.setHeader('content-type', 'application/json')
 
    api(req.body, result => res.json( result ).end() )

  });
}

function api(command, cb){
    /*
    command = {
      cmd:  // command name
    data: // attached data
    } */
  switch (command.cmd){

    case 'test': test(command.data, cb)
      break;

    case 'scan folder': scanFolder(command.data, cb)
      break;

    case 'get names': getNames(command.data, cb)
      break;

    case 'load environment': loadJSON(command.data, cb)
      break;

    case 'save environment': saveJSON(command.data, cb)
      break;

    /*case 'create ast': createAST(command.data, cb)
      break;  */
    
    default: cb({error: 'unknown command'});
  }
}    

  //terminal command:   node app.js ttt -t -so
  //                     0        1        2      3     4
  //process.argv =    ['node', 'app.js', 'ttt', '-t', '-so']
if (process.argv.length > 2) {

  patternsAnalyzed = 0;

  if (process.argv[2] === '-f') testDir = path.join( __dirname, process.argv[3] );
  // you can pass directory to test as parameter to this app like: node app.js testdirname
  else testDir = path.join( __dirname, '..', process.argv[2] );

  if (process.argv.some( (a)=>{ return a === '-t'})) testmode = 1;
  if (process.argv.some( (a)=>{ return a === '-so'})) staticOnlyMode = 1;
  if (process.argv.some( (a)=>{ return a === '-dom'})) scanDomChanges = 1;
  if (process.argv.some( (a)=>{ return a === '-res'})) resolveConflict = 1; // use with -so only

} else {
  // default folder to test
  return;
  //testDir = path.join(__dirname, '..', 'testing');  
}

if (process.argv.some( (a)=>{ return a === '-json'})) {

  console.log('scanning '+process.argv[2]+'.json');

  fs.readFile(process.argv[2] + '.json', 'UTF-8' ,(err, filedata) => {
    if (err) {
      return cb({ err: 'error reding ' + process.argv[2] + '.json' });
    }

    analyzeCSS(JSON.parse(filedata));

  }); 

} else if (scanDomChanges) {

  scanDomCSS( process.argv[2] );

} else if (process.argv[2] === '-f') {
  // here is the routine to scan a .html file (page)

  scanHTMLFile();
// take a file from a folder and scan HTML and JS files
} else if (process.argv.some( (a)=>{ return a === '-a'})) 
    recursive(testDir, function (err, fil) {
        // Read folder for tests and filter .js and html files 
        analyzeNames(fil.filter( (f) => { return f.endsWith( '.json')}));
    });

else recursive(testDir, function (err, fil) {
    // Read folder for tests and filter .js and html files 
    files = fil.filter( (f) => { return f.endsWith( '.js') || f.endsWith( '.html') || f.endsWith( '.htm') });
    
    nextFile(0, ()=>{ console.log('folder scanning completed') }); // run scanning
  });

function test(data, cb) {

  console.log('data received', data);
  cb('Ok');
}

function getNames(data, cb) {

  let p = path.join(__dirname, '..', 'data'); //'public', 'tests');

  fs.readdir(p, (err, files) => {

    cb( files.filter( name => { 
      let stats = fs.statSync(path.join(p, name));
      return stats.isDirectory() && fs.existsSync(path.join(p, name, name + '.js'))
    }))
  })
}

function loadJSON(data, cb){

  let fileName = path.join(__dirname, '..', 'data', data.name, data.name);

  fs.copyFile(fileName + '.js', path.join(__dirname, '..', 'public', 'plugins', data.name + '.js'), (err) => {
    console.log('source.txt was copied to destination.txt');
  });

  fs.readFile(fileName + '.json', 'UTF-8' ,(err, filedata) => {
    if (err) {
      return cb({ err: 'not configured' });
    }

    cb(JSON.parse(filedata)); // call for next file

  }); 
}

function saveJSON(data, cb) {

  let fileName = path.join(__dirname, '..', 'data', data.name, data.name + '.json');

  fs.writeFile(fileName, JSON.stringify(data.content), err => {
    if (err) {
      return cb({ err: 'not saved' });
    }

    cb({msg: data.name +' is saved'}); // call for next file
  }); 

}

function scanFolder(data, cb) {

  testmode = data.testmode || 0;
  staticOnlyMode = data.staticOnlyMode || 0;

  var testDir = data.folder ? path.join(__dirname, '..', 'public', 'tests', data.folder ) : path.join(__dirname, '..', 'testing');

  recursive(testDir, function (err, fil) {
    // Read folder for tests and filter .js and html files 
    files = fil.filter( (f) => { return f.endsWith( '.js') || f.endsWith( '.html') || f.endsWith( '.htm') });
    
    nextFile(0, cb); // run scanning
  });
}

function scanHTMLFile(data, cb){

    files = [];

    JSDOM.fromFile(fileName).then(dom => {
      console.log(dom);
      //GLOBAL.window = window;             // set global context
      let document = dom.window.document;
      // now you can work on parsing HTML as you normally would in a browser
      // e.g. this will work  
      let t = document.querySelectorAll('script');  // collect all <script> tags in document
      //console.log("there are ", t.length, " scripts");

      // for each <script> tag found:
      for (let x = 0; x < t.length; x++ ){
        console.log('script', t[x].src);

        if (t[x].src.indexOf('file:') === 0) files.push( t[x].src.slice(7));

        let data = t[x].innerHTML;  // extract script body

        //let astTree = ast.parse(data);    // if use error non-tolerant AST
        let astTree = ast.parse_dammit(data); // // if use error tolerant AST

        scanBody( astTree, testDir ); // scan current script's body
      }
      console.log('files', files);
      nextFile(0, ()=>{});      
    });

    
    /*jsdom.env({
            file: testDir,
            done: function (err, window) {
                GLOBAL.window = window;             // set global context
                GLOBAL.document = window.document;
                // now you can work on parsing HTML as you normally would in a browser
                // e.g. this will work  
                let t = document.querySelectorAll('script');  // collect all <script> tags in document
                //console.log("there are ", t.length, " scripts");

                // for each <script> tag found:
                for (let x = 0; x < t.length; x++ ){
                  console.log('script', t[x].src);

                  if (t[x].src.indexOf('file:') === 0) files.push( t[x].src.slice(7));

                  let data = t[x].innerHTML;  // extract script body

                  //let astTree = ast.parse(data);    // if use error non-tolerant AST
                  let astTree = ast.parse_dammit(data); // // if use error tolerant AST

                  scanBody( astTree, testDir ); // scan current script's body
                }
                console.log('files', files);
                nextFile(0, ()=>{});
            }
        });*/

}

function nextFile(counter, cb){

  if (counter >= files.length) {
    // on last file termitate and do output
    console.log('file statistics: files count -', scannedFiles.size, 
      ', total size - ', Array.from(scannedFiles).reduce( (tot, val) => { return tot += val[1].size }, 0) )

    jqueryFn.forEach( (e) => {

        if (e.occures.length > 1){

            console.log('name: ' + e.name, e.occures);
            //output += '  ' + e.name + ' : ' + '\n\r';
            //output += 'name: ' + e.name + ' - ' + '(' + e.occures.length + ')' +'\n\n\r';

           e.occures.forEach( occ =>{
              //output += JSON.stringify(occ) + '\n\r';
              console.log(occ.loc);
            })

            
          }
      });
    
    finalize( res => { cb(res) });
    return;
  }

  scanFile( files[counter], () => { 
    nextFile(counter+1, cb); // recursive call with increasing counter
  } );

  function scanFile( name, cb){

    var fileName = name; 

    // Open file and check if it opened correctly
    fs.open(fileName, 'r', (err, fd) => {
      if (err) {
        if (err.code === "ENOENT") {
          console.error('file does not exist');
          return;
        } else {
          throw err;
        }
      }
      let stats = fs.statSync(name);  // read file attributes
      let filename = name.slice( name.lastIndexOf('/')+1 ); // extract file name from full path
      console.log(filename, ' - ', stats.size, name);

      // create a record for scanned file
      var fileRecord = {
        name: filename,
        size: stats.size
      };
      let recordName = filename + stats.size; // create a unique name for recorn in a set

      if (!scannedFiles.has(recordName)){   // each file should have unique name + size

        scannedFiles.set(recordName, fileRecord); // store new filename

        if (fileName.endsWith( '.js')) {  // for JavaScript files

          fs.readFile(fileName, 'UTF-8' ,(err, data) => {
            if (err) throw err;

            //let astTree = ast.parse(data);    // if use error non-tolerant AST
            let astTree = ast.parse_dammit(data, { locations: true }); // // if use error tolerant AST

            declaredNames[indexOfNames] = { 
              file: name, 
              root: { names: [], w: 'window', jq: 'jQuery'}
            }
            scanBody( astTree.body, name, declaredNames[indexOfNames].root, null,  'global' );  // scan current file            
            findBody( astTree, name, declaredNames[indexOfNames].root );
            analyzeDeclared(declaredNames[indexOfNames].root, name);
            indexOfNames++;

            fs.closeSync(fd); // close file

            cb(); // call for next file

          }); 
        } else {    // for HTML files

          //window = (new JSDOM(``, { pretendToBeVisual: true })).window;

          JSDOM.fromFile(fileName).then(dom => {
            console.log(dom);
                  //GLOBAL.window = dom.Window;             // set global context
                  let document = dom.window.document;
                  // now you can work on parsing HTML as you normally would in a browser
                  // e.g. this will work  
                  let t = document.querySelectorAll('script');  // collect all <script> tags in document
                  //console.log("there are ", t.length, " scripts");

                  // for each <script> tag found:
                  for (let x = 0; x < t.length; x++ ){
                    console.log('script', t[x].src);
                    let data = t[x].innerHTML;  // extract script body

                    //let astTree = ast.parse(data);    // if use error non-tolerant AST
                    let astTree = ast.parse_dammit(data); // // if use error tolerant AST

                    declaredNames[indexOfNames] = { 
                      file: name, 
                      root: { names: [], w: 'window', jq: 'jQuery'}
                    }
                    scanBody( astTree, name, declaredNames[indexOfNames].root, null, 'global' ); // scan current script's body
                    findBody( astTree, name, declaredNames[indexOfNames].root );
                    analyzeDeclared(declaredNames[indexOfNames].root, name);
                    indexOfNames++;
                  }
                  fs.closeSync(fd); // close file
                  cb(); // next file            
          });

          /*jsdom.env({
              file: fileName,
              done: function (err, window) {
                  GLOBAL.window = window;             // set global context
                  GLOBAL.document = window.document;
                  // now you can work on parsing HTML as you normally would in a browser
                  // e.g. this will work  
                  let t = document.querySelectorAll('script');  // collect all <script> tags in document
                  //console.log("there are ", t.length, " scripts");

                  // for each <script> tag found:
                  for (let x = 0; x < t.length; x++ ){
                    console.log('script', t[x].src);
                    let data = t[x].innerHTML;  // extract script body

                    //let astTree = ast.parse(data);    // if use error non-tolerant AST
                    let astTree = ast.parse_dammit(data); // // if use error tolerant AST

                    declaredNames[indexOfNames] = { 
                      file: name, 
                      root: { names: [], w: 'window', jq: 'jQuery'}
                    }
                    scanBody( astTree, name, declaredNames[indexOfNames].root, null, 'global' ); // scan current script's body
                    findBody( astTree, name, declaredNames[indexOfNames].root );
                    analyzeDeclared(declaredNames[indexOfNames].root, name);
                    indexOfNames++;
                  }
                  fs.closeSync(fd); // close file
                  cb(); // next file
              }
          });*/
        }

      } else {  // if same name/size found -> omit this file

        console.log(filename, 'is the same. Omitted.');
        fs.closeSync(fd);
        cb(); // next file
      }
    });
  }
}

2

function scanDomCSS(folder){
  Browser.testPage( folder + '/index.html',
    'get css',
    res => {
      console.log('css scanned, analysing...');
    //if (res !== 'error') cb(res);

    analyzeCSS(res);

  });
}