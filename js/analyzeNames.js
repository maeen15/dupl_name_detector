'use strict';

const path = require('path');   // standard Node.js module for PATH management
const fs = require('fs');     // standard Node.js module for file operations

module.exports = function analyzeNames(files){

  if (!(files instanceof Array)) return;

  let buffer = [],
      counter = files.length,
      names = new Map();

  files.forEach( fileName => {
    fs.readFile(fileName, 'UTF-8' ,(err, data) => {
      if (err) throw err;

      buffer = buffer.concat(JSON.parse(data));
      counter--;

      if (!counter) {
        buffer.forEach( r => {
          let rec = names.get(r.name);

          if (!rec) names.set(r.name, r);
          else rec.occures = rec.occures.concat( r.occures);
        });

        buffer = [];
        names.forEach(rec => {
          if (rec.occures.length > 1) {

             rec.occures = rec.occures.reduce( (tot, val) => {
              if (!tot.some( r => { return r.file === val.file })) {
                tot.push(val)
              }
              return tot;
             }, []);

             if (rec.occures.length > 1) buffer.push(rec);
          }
        })

        console.log(buffer)

        if (buffer.length)
        {
          let output = '';
          buffer.forEach( (e) => {
              output += 'name: ' + e.name + ' - ' + '(' + e.occures.length + ')' + JSON.stringify(e.occures) +'\n\n\r';
          });
          fs.writeFile('result.txt', output, (err) => {
            if (err) throw err;
            console.log('Result is saved!' );
          });
        }
        else fs.writeFile('result.txt', ' ', (err) => {
            if (err) throw err;
            console.log('No multiple names found');
          });
      }
    }); 
  })
}