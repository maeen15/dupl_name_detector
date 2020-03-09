'use strict';

const path = require('path');   // standard Node.js module for PATH management
const fs = require('fs').promises;     // standard Node.js module for file operations
const addToVocabular = require("./addToVocabular.js");
const resolve = require("./resolve.js");
const Browser = require("./runPage.js");

const {
    publicFolder,
    outputFolder,

    param,
    vocabular,
    jqueryFn,
    declaredNames,
    namesUsed,
    computed,
    memberexpr,
    goodWords,
    badWords
} = require("./globals.js");

// Save all variables name for inspection
async function saveDeclaredNames() {
    await fs.writeFile(path.join(outputFolder, 'declared.json'),
        JSON.stringify(declaredNames.map(file => {
                //removePointers(file.root);
            file.root = convertVarRecords(file.root);
            return file;
        })));
    console.log('declared is saved!');
}
function removePointers(node){
    if (node.parent) delete node.parent;
    if (node.bodies) delete node.bodies;

    node.names = node.names.map( entry => entry.name);

    if (node.children)
    {
        node.children.forEach( child => removePointers(child));
        node.children = node.children.filter( child => child.names.length || child.children);
    }
}

function convertVarRecords(node){
    let copy = {};

    for (let prop in node)
        if (node.hasOwnProperty(prop) && prop !== 'parent' && prop !== 'bodies')
        {
            copy.names = node.names.filter( entry => entry.type !== 'assignee')
                .map( entry => entry.name);

            if (node.children)
            {
                copy.children = node.children.map( child => convertVarRecords(child));
                node.children = node.children.filter(
                    child => child.names.length || (child.children && child.children.length)
                );
            }
        }
    return copy;
}
// Filter and sort found patterns to evaluate computed member expressions
// And all member expressions.
// In case of multiple files arranges files in descending order of members found
async function prepareAndSaveComputed() {
    let output = computed.concat(memberexpr).reduce((tot, val) => {
        let file;

        function getfile(v) {
            var file = tot.find(f => f.path === v.file);
            if (!file)
            {
                file = {path: v.file, names: []};
                tot.push(file);
            }
            return file;
        }

        if (val instanceof Map)
        {
            val.forEach(val =>
                val.occures.forEach(rec => {
                    file = getfile(rec);
                    file.names.push(val.name);
                })
            );
            return tot;
        }

        file = getfile(val);

        if (val.name) file.names.push(val.name);
        else if (val.eval) file.names.push('eval');

        return tot;
    }, []);

    output.forEach(rec => {
        rec.names = rec.names.filter(name =>
            goodWords.some(w => name.indexOf(w) >= 0) || !badWords.some(w => name.indexOf(w) >= 0)
        );
    });

    output
        .sort((a, b) => (b.names.length - a.names.length))
        .sort((a, b) => (
                b.names.filter(name =>
                    goodWords.some(w => name.indexOf(w) >= 0)
                ).length -
                a.names.filter(name =>
                    goodWords.some(w => name.indexOf(w) >= 0)
                ).length
            )
        );

    await fs.writeFile(path.join(outputFolder, 'computed.json'), JSON.stringify(output));
    console.log('computed is saved!');
}

async function checkForJqReservedNames() {
    try
    {
        let data = await fs.readFile(path.join(__dirname, 'lib', 'jquery' + param.jQVersion + '.json'), 'UTF-8');
            //build a tree of jQuery properties
        let jQueryTree = JSON.parse(data);

        jqueryFn.forEach(e => {
            let splitted = e.name.split('.');
            if (splitted[0] === '$' && !inTree(splitted, jQueryTree))
                e.occures.push({type: 'jQuery' + param.jQVersion + ' reserved name'});
        });
    }
    catch (err)
    {
        console.log('There is no valid JSON file for jQuery', param.jQVersion, 'Error:', err);
    }
}

function inTree(split, jQueryTree) {
    return match(jQueryTree, 0, param.jQVersion);

    function match(subtree, level, name) {
        if (subtree.name === name || subtree.name === split[level])
        {
            let nextName = split[level + 1];
            if (!nextName) return true;

            if (subtree.children)
            {
                let branch = subtree.children.find((ch) => ch.name === nextName);

                return branch
                       ? match(branch, level + 1)
                       : false;

            }
            else return false;
        }
        else return false;
    }
}

async function writeTheRest(cb) {
    try
    {
        await saveDictionary(jqueryFn, 'JQoutput', {
            saveJSON: 1,
            prefix: param.multipleJQueryFound ? 'WARNING! Multuple jQuery instances found. \n\n\r' : ''
        });
        await saveDictionary(memberexpr, 'OBJoutput');

        if (param.resolveConflict)
            await resolve();

        cb({msg: 'save completed'});
    }
    catch(err)
    {
        cb({msg: err, error: true});
    }
}

// find in computed a record with same loc.start
// add a value to an array (supposing there are many possible names for each injection)
// for each computed with set value, vor every value generate dotted name
// add this name to vocabular
function findNewJqNames(file) {
    computed.forEach(rec => {
        let property = rec.eval || rec.accName[0],
            loc = property.loc;

        if (rec.accName)
        {
            if (typeof rec.nodeStart === 'object')
            {
                rotateValues(
                    rec,
                    rec.accName.length - 1,
                    rec.nodeStart.actual
                            ? rec.accName[rec.accName.length - 1].name
                            : '$',
                    rec.nodeStart,
                    name => addToVocabular(jqueryFn, name, 'dynamic', file, loc)
                );
            }
            else
            {
                let val = rec.accName[rec.accName.length - 1].val;
                val = val ? val[0] : null;
                if (val !== 'object')
                    rotateValues(
                        rec,
                        rec.accName.length - 1,
                        '$',
                        null,
                        name => addToVocabular(jqueryFn, name, 'dynamic', file, loc)
                    );
            }
        }
        else
            addToVocabular(jqueryFn, property.val && property.val.join('|') || 'none', 'eval', file, loc);
    });
}

// as soon as one variable in computed expression may have several values,
// we need to add separate dotted name with each
function rotateValues(rec, idx, name, obj, saver) {
    let property = rec.accName[--idx];

    // if no property -> end of chain is reached, stop the process and save resulting name
    if (!property)
    {
        if (obj)
            obj.fullName = name.replace(obj.name, obj.actual);
        else
            saver(name);
    }
    // if property is not computed -> concatenate names and go for the next
    else if (!property.computed)
        rotateValues(rec, idx, name + '.' + property.name, obj, saver);

    // if there is a value -> some value(s) retrieved from runtime
    else if (property.val && property.val.length)
        property.val.forEach(val =>
            rotateValues(rec, idx, name + '.' + val, obj, saver)
        );

    // if reached here -> a computed value was not resolved at runtime
    else
        rec.incompleted = true;
}

// clean from non-global variables
function findNewGlobalObjProperties() {
    memberexpr.forEach((m, key) => {
        m.occures = m.occures.filter(rec => {
            if (rec.actual)
            {
                rec.fullName = rec.fullName.replace(m.name, rec.actual);

                if (rec.fullName.startsWith('$') || rec.fullName.startsWith('jQuery'))
                    addToVocabular(jqueryFn, rec.fullName, 'dynamic', m.file, rec.loc);

                return true;
            }
        });

        if (!m.occures.length) memberexpr.delete(key);
    });
}

function saveDictionary(dictionary, outname, {saveJSON, prefix} = {}) {
    return new Promise( async resolve => {
        let output = prefix || '';
        dictionary.forEach(e => {
            //console.log('e', e);
            if (e.occures.length > 1 || param.testmode)
                output += `  ${e.name} : \n${
                    e.occures.map(occ => JSON.stringify(occ)).join('\n')
                }\n\n\r`;
        });

        try
        {
            await fs.writeFile(path.join(outputFolder, outname + '.txt'), output);
            console.log(outname + '.txt saved!');

            if (saveJSON)
            {
                await fs.writeFile(path.join(outputFolder, outname + '.json'),
                    JSON.stringify(Array.from(dictionary).map(rec => rec[1])));
                console.log(outname + '.json saved!');
            }
            resolve();
        }
        catch (err)
        {
            throw err;
        }
    });
}

function setComputedVal(v, members, files) {
    if (v.g)
    {
        let {val, line, col} = v,
            obj = members.find(d =>
                d.loc.start.line === line && d.loc.start.column === col
            );

        if (obj)
        {
            obj.actual = val;

            let comp = computed.find(d =>
                d.nodeStart === obj.loc.start.pos && d.file === files[0].file
            );
            if (comp)
                comp.nodeStart = obj;
        }
        else
            console.log('WARNING! Can not find ', v);
    }
    else
    {
        let {val, line, col} = v,
            obj = computed.find(d =>
                d.file === files[0].file &&
                (d.accName && d.accName.some(r =>
                        r.loc.start.line === line && r.loc.start.column === col
                    ) ||
                    (d.eval && d.eval.loc.start.line === line && d.eval.loc.start.column === col)
                )
            );

        if (obj)
        {
            obj = obj.eval
                  ? obj.eval
                  : obj.accName.find(r => (
                    r.loc.start.line === line && r.loc.start.column === col
                ));

            if (!obj.val) obj.val = [];
            if (obj.val.indexOf(val) < 0) obj.val.push(val);
        }
        else
        {
            let {val, line, col} = v,
                obj = members.find(d =>
                    d.loc.start.line === line && d.loc.start.column === col
                );

            if (obj)
                obj.notglobal = val;
            else
                console.log('WARNING! Can not find ', v);
        }
    }
}

async function saveInjected(file, list, cb){
    let data, res,
        filename = file.slice(file.lastIndexOf('/') + 1);

    data = await fs.readFile(file, 'UTF-8');

    // prepare injected code
    list.forEach( e => {
        if (e.name && e.name.indexOf('uncaptured:') === -1)
        {
            let index = (e.loc.start.line || 0) - 1,
                col = e.loc.start.column || -1,
                //str = lines[ index ],
                first, last,
                injected = e.fullName
                           ? e.loc.type && e.loc.type === 'VariableDeclarator'
                             ? `dummy${Date.now()}=injected(${index+1},${col},${e.name}),`
                             : `injected(${index+1},${col},${e.name}),`
                           : `injected(${index+1},${col},${data.slice(e.loc.start.pos, e.loc.end.pos)})`;

            // TODO: case when !e.name -> copy a text between loc.start - loc.end

            // substituting the computed property name for a incejtion, ex: $.b[c] -> $.b[injected(#row, #col, c)]
            first = data.slice(0, e.loc.start.pos);
            last = data.slice(e.fullName ? e.loc.start.pos : e.loc.end.pos);
            data = first + injected + last;
        }
    });
    console.log('filename',  path.join(publicFolder, filename.slice(0, -3), filename));

    await fs.writeFile( path.join(publicFolder, filename.slice(0, -3), filename), data);

    console.log('Injected saved!');

    res = await Browser.testPage( 'frame/index.html', null);
    console.log('iframe keys:', res.type ==='string' ? JSON.parse(res.value).length : 'error on getting keys');

    await fs.writeFile( path.join(publicFolder, filename.slice(0, -3), 'keys.js'),
        'var iframeKeys = new Set('+ res.value +');');

    res = await Browser.testPage( filename.slice(0, -3) + '/index.html', null);
    console.log('page res:', res.type ==='string' ? JSON.parse(res.value).length : ('error on getting variables: ' + res));

    cb(res);
}

module.exports = async function finalize(cb) {

    saveDictionary(vocabular, 'GlobalNames', {
        saveJSON: 1
    });

    if (param.resolveConflict)
    {
        await fs.writeFile(path.join(outputFolder, 'namesUsed.json'),
            JSON.stringify(Array.from(namesUsed).map(rec => rec[1])));

        console.log('namesUsed is saved!');
    }

    if (param.testmode)
    {
        saveDeclaredNames();
        prepareAndSaveComputed();
    }

    // same for JQuery names
    if (param.jQVersion === '1.4.4' || param.jQVersion === '1.5.1')
        jqueryFn.forEach(e => {
            let path = e.occures[0].file;
            if (e.occures.length > 1 && e.occures.every(item => item.file === path))
                jqueryFn.delete(e.name);
        });

    if (param.jQVersion)
        await checkForJqReservedNames();

    if (!param.staticOnlyMode && (computed.length || memberexpr.size))
    {
        console.log('memberexpr:', memberexpr.size);

        // transform found member expressions to plain array
        let members = [],
            combined, f, file, injections;

        memberexpr.forEach(rec =>
            rec.occures.forEach(m => {
                m.name = rec.name;
                if (!m.fullName) m.fullName = m.name;
                members.push(m);
            })
        );

        console.log('members:', members.length);

        // combine all
        combined = computed.concat(members)
            // organize entries by file. [[],[]....]
            .reduce((tot, val) => {
                let entry = tot.find(f => f[0].file === val.file);

                if (entry) entry.push(val);
                else tot.push([val]);

                return tot;
            }, []);

        if (combined.length > 1)
            console.log('WARNING! Dynamic test is performed with single plugin. The rest is ignored.');

        f = combined[0];
        file = f[0].file;

        injections = f.reduce((tot, rec) => {
            if (rec.accName) rec.accName.forEach(expr => {
                if (expr.computed) tot.push(expr);
            });
            else if (rec.eval) tot.push(rec.eval);
            else if (rec.fullName) tot.push(rec);

            return tot;
        }, [] /*variables.slice(0)*/);

        injections
            .sort((a, b) => (b.loc.start.pos - a.loc.start.pos));

        // here we need to open each source js file
        // add propbe call text at given location
        // save changed file in a new folder
        // for performance purpose, we need to group changes by file
        // then by line then by position

        saveInjected(file, injections, res => {
            if (res.value)
                JSON.parse(res.value).forEach(v => setComputedVal(v, members, f));

            findNewJqNames(file);

            // evaluate a number of records in computed, which remain without value
            // this means unused value or improper runtime conditions
            console.log('incompleted computed:', computed.reduce((t, v) => v.incompleted ? ++t : t, 0), 'from', computed.length);
            console.log('completed members:', members.reduce((t, v) => (v.notglobal || v.actual) ? ++t : t, 0), 'from', members.length);

            findNewGlobalObjProperties();

            Browser.close();
            writeTheRest(cb);
        });
    }
    else
        writeTheRest(cb);
};