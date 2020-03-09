'use strict';

/*  Read saved .json files with names data and outputs duplicated  */

const fs = require('fs');     // standard Node.js module for file operations

module.exports = function analyzeNames(files) {

    if (!(files instanceof Array)) return;

    let buffer = [],
        counter = files.length,
        names = new Map(),
        analyze = () => {
            buffer.forEach(r => {
                let rec = names.get(r.name);

                if (rec)
                    rec.occures = rec.occures.concat(r.occures);
                else
                    names.set(r.name, r);
            });

            buffer.length = 0;  // clean buffer
            names.forEach(rec => {
                if (rec.occures.length > 1)
                {
                    rec.occures = rec.occures.reduce((tot, val) => {
                        if (!tot.some(r => r.file === val.file))
                            tot.push(val);
                        return tot;
                    }, []);

                    if (rec.occures.length > 1) buffer.push(rec);
                }
            });

            if (buffer.length)
            {
                let output = '';
                buffer.forEach(e => {
                    output += 'name: ' + e.name + ' - ' + '(' + e.occures.length + ')' + JSON.stringify(e.occures) + '\n\n\r';
                });
                fs.writeFile('result.txt', output, (err) => {
                    if (err) throw err;
                    console.log('Result is saved!');
                });
            }
            else
            {
                fs.writeFile('result.txt', ' ', (err) => {
                    if (err) throw err;
                    console.log('No multiple names found');
                });
            }
        };

    files.forEach(fileName =>
        fs.readFile(fileName, 'UTF-8', (err, data) => {
            if (err) throw err;

            buffer = buffer.concat(JSON.parse(data));
            counter--;

            if (!counter)
                analyze();
        })
    );
};