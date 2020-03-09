'use strict';

const path = require('path');
const fs = require('fs');

const {
    outputFolder
} = require("./globals.js");

module.exports = function analyzeCSS(data){
    let styleSheets;

    if (data.IDs.length)
    {
        console.log('there are', data.IDs.length, 'IDs found');

        let duplicatedIDs = [];

        data.IDs.forEach( d => {
            if (d[1] > 1) duplicatedIDs.push(d[0]);
        });

        console.log('there are', duplicatedIDs.length, 'duplicated IDs:', duplicatedIDs);
    }

    // extract sylesheets IDs
    styleSheets = data.styleSheets instanceof Array ? data.styleSheets : Object.keys(data.styleSheets);

    console.log('styleSheets', styleSheets);

    // if there are less than 2 stylesheets -> no css conflicts
    if (styleSheets.length > 1)
    {
        let buffer = [],
            conflictedElements = [],
            findDiffStyles = key => {
                let sheets = new Set();
                data[key].matched.matchedCSSRules.forEach(m => {
                    if (m.rule.styleSheetId)
                        sheets.add(m.rule.styleSheetId);
                });

                if (sheets.size > 1)
                    buffer.push(data[key]);
            };

        // clean input data
        delete data.styleSheets;
        delete data.IDs;

        // find elements with styles from different stylesheets
        for (let key in data)
            if (data.hasOwnProperty(key))
                findDiffStyles(key);

        // find same styles applied to the same element
        buffer.forEach(item => {
            let styles = new Map();
            let conflictedStyles = new Map();

            styleSheets.forEach(key => styles.set(key, {}));

            item.matched.matchedCSSRules.forEach(m => {
                if (m.rule.styleSheetId)
                {
                    let style = styles.get(m.rule.styleSheetId);

                    m.rule.style.cssProperties.forEach(prop => {
                        if (!prop.disabled)
                            style[prop.name] = prop.value;
                    });
                }
            });

            styles.forEach((val, stylesheetID) => {
                for (let k in val)
                    if (val.hasOwnProperty(k))
                    {
                        let record = conflictedStyles.get(val[k]);
                        if (!record)
                        {
                            record = {stylesheets: new Set()};
                            conflictedStyles.set(k, record);
                        }
                        record.stylesheets.add(stylesheetID);
                    }
            });

            conflictedStyles = Array.from(conflictedStyles);
            conflictedStyles = conflictedStyles.filter(style => style[1].stylesheets.size > 1);
            conflictedStyles = conflictedStyles.map(style => ({[style[0]]: Array.from(style[1].stylesheets)}));

            if (conflictedStyles.length)
                conflictedElements.push({
                    nodeName: item.nodeName,
                    path: item.path,
                    conflictedStyles: conflictedStyles
                });
        });

        console.log('conflictedElements:', conflictedElements.length);

        if (conflictedElements.length)
            fs.writeFile(path.join(outputFolder, 'conflictedcss.json'), JSON.stringify(conflictedElements));
    }
};