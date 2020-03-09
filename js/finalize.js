'use strict';

const path = require('path');   // standard Node.js module for PATH management
const fs = require('fs');     // standard Node.js module for file operations
const addToVocabular = require( path.join(__dirname, "addToVocabular.js"));
const resolve = require( path.join(__dirname, "resolve.js"));

module.exports = function finalize(cb){
  //console.log(jqueryFn.entries(), vocabular.entries());
  let entries = vocabular.entries();

  // ouputs global names
  let output = '';


  vocabular.forEach( (e) => {

    if (e.occures.length > 1 || testmode) // if name occures more than 1 time
      output += 'name: ' + e.name + ' - ' + '(' + e.occures.length + ')' + JSON.stringify(e.occures) +'\n\n\r';

  });
  //output += '\n\r';
  fs.writeFile('output.txt', output, (err) => {
    if (err) throw err;
    console.log('It\'s saved!' );
  });
  fs.writeFile('output.json', 
    JSON.stringify(Array.from(vocabular).map(rec => rec[1])), 
    (err) => {
      if (err) throw err;
      console.log('It\'s saved!' );
    });

  if (resolveConflict)
    fs.writeFile('namesUsed.json', 
      JSON.stringify(Array.from(namesUsed).map(rec => rec[1])), 
      (err) => {
        if (err) throw err;
        console.log('It\'s saved!' );
      });

  if (testmode) {
    output = declaredNames.map( (file)=>{
      removePointers(file.root);
      return file
    })

    fs.writeFile('declared.json', JSON.stringify(output), (err) => {
      if (err) throw err;
      console.log('declared is saved!' );
    });

    // filter and sort found patterns to inject
    output = computed.concat(memberexpr).reduce((tot, val)=>{

      var file;
      function getfile(v){
        var file = tot.find( f => { return f.path === v.file})
        if (!file) {
          file = { path: v.file, names: []}
          tot.push(file)
        }
        return file;
      }

      if (val instanceof Map) {

        val.forEach( val => {
          val.occures.forEach(rec => {
            file = getfile(rec);
            file.names.push(val.name);
          })
        })
        return tot;
      }

      file = getfile(val);

      if (val.name) file.names.push(val.name);
      else if (val.eval) file.names.push('eval');

        return tot;
    }, [])

    output.forEach(rec => {
      rec.names = rec.names.filter(name => {
        return goodWords.some( w => {
                  return name.indexOf(w) >= 0
                }) ||
                !badWords.some( w => {
                  return name.indexOf(w) >= 0
                })
      })
    })

    output
      .sort((a,b)=>( b.names.length - a.names.length))
      .sort((a,b)=>{
        return b.names.filter(name => {
                  return goodWords.some( w => {
                    return name.indexOf(w) >= 0
                  })
                }).length -
                a.names.filter(name => {
                  return goodWords.some( w => {
                    return name.indexOf(w) >= 0
                  })
                }).length
      })

    fs.writeFile('computed.json', JSON.stringify(output), (err) => {
      if (err) throw err;
      console.log('computed is saved!' );
    });
  }

  // same for JQuery names
  output = multipleJQueryFound ? 'WARNING! Multuple jQuery instances found. \n\n\r' : '';

  if (jQVersion === '1.4.4' || jQVersion === '1.5.1') jqueryFn.forEach( (e) => {
    let path = e.occures[0].file;
    if (e.occures.length > 1 && e.occures.every( (item) => {
          return item.file === path
        })) jqueryFn.delete(e.name);
  })

  if (jQVersion) {

    fs.readFile(path.join(__dirname, 'lib', 'jquery'+ jQVersion + '.json'), 'UTF-8', (err, data) => {
      if (err) {
        console.log('There is no valid JSON file for jQuery' + jQVersion)
        return
      };

      //build a tree of jQuery properties
      let jQueryTree = JSON.parse(data);

      jqueryFn.forEach( (e) => {
        let splitted = e.name.split('.')
        if (splitted[0] !== '$' || !inTree(splitted)) return;

        e.occures.push({ type: 'jQuery' + jQVersion +' reserved name'})
      })

      write()

      function inTree(split){
        //let level = 0
        console.log(split, 'checked')
        return match(jQueryTree, 0, jQVersion) //false

        function match(subtree, level, name){
          if (subtree.name === name || subtree.name === split[level]) {

            let nextName = split[level+1]
            if (!nextName) return true;

            if (subtree.children) {
              let branch = subtree.children.find( (ch) => {
                return ch.name === nextName
              })
              if (!branch) return false;

              return match(branch, level+1)

            } else return false
          } else return false
        }
      }
    });
  } else write()

  function write(){

    if (!staticOnlyMode && (computed.length || memberexpr.size)) {

      console.log('memberexpr:', memberexpr.size)
      let members = [];
      memberexpr.forEach(rec => {

        //console.log('m', rec);
          rec.occures.forEach(m => {
            m.name = rec.name;
            if (!m.fullName) m.fullName = m.name;
            members.push(m)
          })
      })

      console.log('members:', members.length)
      //let sortedByFileName =
      computed.concat(members).reduce((tot, val) => {

        let entry = tot.find( f => (
                        f[0].file === val.file
                    ))

        if (entry) entry.push(val);
        else tot.push([val])

        return tot

      }, []).forEach( f => {

        let file = f[0].file,
            injections = f.reduce((tot, rec) => {

          if (rec.accName) rec.accName.forEach( expr => {
            if (expr.computed) tot.push(expr);
          });
          else if (rec.eval) tot.push(rec.eval)
          else if (rec.fullName) tot.push(rec);

          return tot;
        }, variables.slice(0));

        injections
          .sort((a,b) => (b.loc.start.pos - a.loc.start.pos))

        //console.log('injections', injections);

        // here we need to open each source js file
        // add propbe call text at given location
        // save changed file in a new folder
        // for performance purpose, we need to group changes by file
        // then by line then by position

        saveInjected(file, injections, res => {

          if (res.value)
            JSON.parse(res.value).forEach( setComputedVal );

              // find in computed a record with same loc.start
              // add a value to an array (supposing there are many possible names for each injection)
              // for each computed with set value, vor every value generate dotted name
              // add this name to vocabular

          computed.forEach( rec => {

            //console.log('rec', rec);

              let property = rec.eval || rec.accName[0],
                  //dotted = property.name, // first entry should be a Identyfier
                  loc = property.loc; //{ line: property.loc.start.line, col: property.loc.start.col };

              if (rec.accName) {
                if (typeof rec.nodeStart === 'object') {
                  rotateValues(
                    rec.accName.length-1, 
                    rec.nodeStart.actual 
                        ?  rec.accName[rec.accName.length-1].name
                        : '$', 
                    rec.nodeStart
                  );
                }
                else {
                  let val = rec.accName[rec.accName.length-1].val;
                    val = val ? val[0] : null;
                  if (val !== 'object') rotateValues(rec.accName.length-1, '$');
                }
              }
              else addToVocabular(jqueryFn, property.val && property.val.join('|') || 'none', 'eval', file, loc);

              function rotateValues(idx, name, obj){

                let property = rec.accName[--idx];

                // if no property -> end of chain is reached, stop the process and save resulting name
                if (!property)
                  if (obj) return obj.fullName = name.replace(obj.name, obj.actual);
                  else return addToVocabular(jqueryFn, name, 'dynamic', file, loc);

                // if property is not computed -> concatenate names and go for the next
                if (!property.computed)
                  return rotateValues(idx, name + '.' + property.name, obj);

                // if there is a value -> some value(s) retrieved from runtime
                if (property.val && property.val.length) {
                  return property.val.forEach( val => { rotateValues(idx, name + '.' + val, obj) })
                }

                // if reached here -> a computed value was not resolved at runtime
                rec.incompleted = true
              }

            })
              /*
              fs.writeFile('computed.json', JSON.stringify(computed), (err) => {
                if (err) throw err;
                console.log('computed is saved!' );
              });
              /*
              fs.writeFile('memberexpr.json', JSON.stringify(Array.from(members)), (err) => {
                if (err) throw err;
                console.log('computed is saved!' );
              });*/

            // evaluate a number of records in computed, which remain without value
            // this means unused value or improper runtime conditions
            console.log('incompleted computed:', computed.reduce( (t, v) =>{ return v.incompleted ? ++t : t }, 0), 'from', computed.length);
            console.log('completed members:', members.reduce( (t, v) =>{ return (v.notglobal || v.actual) ? ++t : t }, 0), 'from', members.length);

          // clean from non-global variables
          memberexpr.forEach( (m, key) => {

            m.occures = m.occures.filter( rec => {

              if (rec.actual){
                rec.fullName = rec.fullName.replace(m.name, rec.actual);

                if (rec.fullName.startsWith('$') || rec.fullName.startsWith('jQuery'))
                  addToVocabular(jqueryFn, rec.fullName, 'dynamic', m.file, rec.loc);

                return true;
              }
              return;
            });

            if (!m.occures.length) memberexpr.delete(key);
          })

          //saveFnDictionary();
          saveDictionary(jqueryFn, 'JQoutput', 1);
          output = '';
          saveDictionary(memberexpr, 'OBJoutput');
          Browser.close();
        });

        function setComputedVal(v) {

          if (v.g ){

            //console.log('object', v);

            let { val, line, col } = v,
              obj = members.find( d => {
               return d.loc.start.line === line && d.loc.start.column === col;
            });

            if (!obj) {
              console.log('WARNING! Can not find ', v);
              return;
            }

            obj.actual = val;

            let comp = computed.find( d => { return d.nodeStart === obj.loc.start.pos && d.file === f[0].file});
            if (comp) {

              //console.log('comp', obj, comp);
              comp.nodeStart = obj;
            }

            return;
          }

          let { val, line, col} = v,
            obj = computed.find( d => {
              return d.file === f[0].file && (d.accName && d.accName.some( r=> {
                              return r.loc.start.line === line && r.loc.start.column === col;
                            }) || (d.eval && d.eval.loc.start.line === line && d.eval.loc.start.column === col))
                          });
          //console.log('found d', obj, line, col, val);

          if (!obj) {
            let { val, line, col } = v,
              obj = members.find( d => {
               return d.loc.start.line === line && d.loc.start.column === col;
            });

            if (!obj) {
              console.log('WARNING! Can not find ', v);
              return;
            }

            obj.notglobal = val;

            return;
          }

          obj = obj.eval
                  ? obj.eval
                  : obj.accName.find( r=> (
                       r.loc.start.line === line && r.loc.start.column === col
                    ));

          if (!obj.val) obj.val = [];
          if (obj.val.indexOf(val) < 0) obj.val.push(val);

          //return obj;
        }
      })

    } else {
      saveDictionary(jqueryFn, 'JQoutput', 1);
      output = '';
      saveDictionary(memberexpr, 'OBJoutput');

      if (resolveConflict) resolve();

      Browser.close();
    }

    function saveDictionary(dictionary, outname, saveJSON){
      dictionary.forEach( (e) => {

        if (e.occures.length > 1 || testmode){

            //console.log('name: ' + e.name + ' - ' + JSON.stringify(e.occures) + '\n\n\r')
            output += '  ' + e.name + ' : ' + '\n\r';
            //output += 'name: ' + e.name + ' - ' + '(' + e.occures.length + ')' +'\n\n\r';

           e.occures.forEach( occ =>{
              output += JSON.stringify(occ) + '\n\r';
            })

            output += '\n\n\r';
          }
      });

      fs.writeFile(outname + '.txt', output, (err) => {
        if (err) throw err;
        console.log(outname + '.txt saved!');
        cb({ msg: 'save completed' });
      });

      if (saveJSON) 
        fs.writeFile(outname + '.json', 
                      JSON.stringify(Array.from(dictionary).map(rec => rec[1])), 
                      (err) => {
                        if (err) throw err;
                        console.log(outname + '.json saved!');
                        cb({ msg: 'save completed' });
                      });
    }
  }

  function saveInjected(file, list, cb){

    let //file = list[0].node.file,
        newPath = path.join(__dirname, '..', 'public'),
        filename = file.split('/');
        filename = filename[filename.length - 1]

     //console.log('list', list[0].loc.start, list[0].loc.end);

    fs.readFile(file, 'UTF-8', (err, data) => {
      if (err) throw err;

      //let lines = data.split('\n');

      list.forEach( (e)=> {
        //console.log('e', e);

        if (e.name && e.name.indexOf('uncaptured:') >= 0) return;

        let index = (e.loc.start.line || 0) - 1,
            col = e.loc.start.column || -1,
            //str = lines[ index ],
            first, last,
            injected = e.fullName

                        ? e.loc.type && e.loc.type === 'VariableDeclarator' 
                            ? 'dummy'+ Date.now()+'=injected('+ (index+1) + ','+ col + ','+ e.name +'),'
                            : 'injected('+ (index+1) + ','+ col + ','+ e.name +'),'

                        : 'injected('+ (index+1) + ','+ col + ','+ data.slice(e.loc.start.pos, e.loc.end.pos) +')';

        // TODO: case when !e.name -> copy a text between loc.start - loc.end

        // substituting the computed property name for a incejtion, ex: $.b[c] -> $.b[injected(#row, #col, c)]
        first = data.slice(0, e.loc.start.pos)
        last = data.slice(!e.fullName /*e.loc.end.pos*/ ? e.loc.end.pos : e.loc.start.pos)
        data = first + injected + last
      })
      console.log('filename',  path.join(newPath, filename.slice(0, -3), filename));

      fs.writeFile( path.join(newPath, filename.slice(0, -3), filename),
        data,
        (err) => {
          if (err) throw err;

          console.log('Injected saved!');

          Browser.testPage( 'frame/index.html',
            null,
            res => {
                console.log('iframe keys:', res.type ==='string' ? JSON.parse(res.value).length : 'error on getting keys');

                fs.writeFile( path.join(newPath, filename.slice(0, -3), 'keys.js'),
                  'var iframeKeys = new Set('+ res.value +');',
                  (err) => {
                      if (err) throw err;

                      if (cb)
                        Browser.testPage( filename.slice(0, -3) + '/index.html',
                            null,
                            res => {
                              console.log('page res:', res.type ==='string' ? JSON.parse(res.value).length : ('error on getting variables: ' + res));
                            if (res !== 'error') cb(res);
                          });
                });

            });
        });
    });

  }

  function removePointers(node){
    if (node.parent) delete node.parent;
    if (node.bodies) delete node.bodies;

    node.names = node.names.map( (entry)=>{
      return entry.name;
    })
    if (node.children) {
      node.children.forEach( (child)=>{
          removePointers(child)
        })
      node.children = node.children.filter( (child)=>(
        child.names.length || child.children
      ))
    }
  }

}