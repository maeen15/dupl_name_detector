'use strict';

const path = require('path');   // standard Node.js module for PATH management
const fs = require('fs');     // standard Node.js module for file operations

module.exports = function resolve(){

  let /*variableNames = vocabular.filter( (e) => {
        return e.occures.length > 1 
      }),
      methodNames = jqueryFn.filter( (e) => {
        return e.occures.length > 1 
      }),*/
      toBeChanged = new Map();

  vocabular.forEach((e, short) => {

    if (e.occures.length < 2) return;

    let nameUsed = namesUsed.get(short);
    if (!nameUsed) return console.log('something wrong with variable', short);

    console.log(short, 'is renamed');

    nameUsed.occures.forEach(n => {
      if (n.type !== 'variable') return;

      let file = toBeChanged.get(n.file),
          suffix;

      if (!file) {
        suffix = Math.ceil(Math.random(1)*1000000000).toString(16);
        file = { filename: n.file, newFileName: n.file.slice(0, -3) +'-' + suffix + '.js', suffix, list: [] };
        toBeChanged.set(n.file, file);
      }
      else
        suffix = file.suffix;

      file.list.push({ name: short + suffix, loc: n.loc});

    });
    
  });

  jqueryFn.forEach((e, short) => {

    if (e.occures.length < 2) return;

    short = short.slice(short.lastIndexOf('.') + 1);

    let nameUsed = namesUsed.get(short);
    if (!nameUsed) return console.log('something wrong with property', short);

    console.log(short, 'is renamed');

    nameUsed.occures.forEach(n => {
      if (n.type !== 'property') return;

      let file = toBeChanged.get(n.file),
          suffix;

      if (!file) {
        suffix = Math.ceil(Math.random(1)*1000000000).toString(16);
        file = { filename: n.file, newFileName: n.file.slice(0, -3) + '-' + suffix + '.js', suffix, list: [] };
        toBeChanged.set(n.file, file);
      }
      else
        suffix = file.suffix;

      file.list.push({ name: short + suffix, loc: n.loc});

    });
    
  });

  toBeChanged.forEach(file => {
    file.list.sort((a,b) => (b.loc.start.pos - a.loc.start.pos))

    fs.readFile(file.filename, 'UTF-8', (err, data) => {
      if (err) throw err;

      file.list.forEach(e => {

        let first = data.slice(0, e.loc.start.pos),
            last = data.slice(e.loc.end.pos);

        data = first + e.name + last
      });

      fs.writeFile( file.newFileName, data, err => {
        if (err) throw err;

        console.log(file.newFileName, 'saved!');
      });

    });
  })

}