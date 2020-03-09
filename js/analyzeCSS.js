'use strict';

const file = require('fs');

module.exports = function analyzeCSS(data){

  if (data.IDs.length){
    console.log('there are', data.IDs.length, 'IDs found');

    let duplicatedIDs = [];

    data.IDs.forEach( d => {
      if (d[1] > 1) duplicatedIDs.push(d[0]);
    })

    console.log('there are', duplicatedIDs.length, 'duplicated IDs:', duplicatedIDs);
  }

  // extract sylesheets IDs
  let styleSheets = data.styleSheets instanceof Array ? data.styleSheets : Object.keys(data.styleSheets);

  console.log('styleSheets', styleSheets);

  // if there are less than 2 stylesheets -> no css conflicts
  if (styleSheets.length < 2) return;

  // clean input data
  delete data.styleSheets;
  delete data.IDs;

  let buffer = [];

  // find elements with styles from different stylesheets
  for (let key in data){
    if (data.hasOwnProperty(key)){
      let sheets = new Set();
      data[key].matched.matchedCSSRules.forEach(m => {
        if (m.rule.styleSheetId) sheets.add(m.rule.styleSheetId);
      })

      if (sheets.size > 1){
        buffer.push(data[key])
      }
    }
  }

  //console.log('css possible conflicts in', buffer);

  let conflictedElements = [];

  // find same styles applied to the same element
  buffer.forEach(item => {

    let styles = new Map();

    styleSheets.forEach(key => {
      styles.set(key, {});
    })

    item.matched.matchedCSSRules.forEach(m => {
      if (!m.rule.styleSheetId) return;

      let style = styles.get(m.rule.styleSheetId);

      m.rule.style.cssProperties.forEach(prop => {
        if (prop.disabled) return;

        style[prop.name] = prop.value;
      })
    })

    let conflictedStyles = new Map();

    styles.forEach((val, stylesheetID) => {

      Object.keys(val).forEach( k=>{

        let record = conflictedStyles.get(k);
        if (!record) {
          record = {stylesheets: new Set()};
          conflictedStyles.set(k, record);
        }
        record.stylesheets.add(stylesheetID);

      })
    })

    conflictedStyles = Array.from(conflictedStyles);

    conflictedStyles = conflictedStyles.filter(style => {
      return style[1].stylesheets.size > 1;
    })

    conflictedStyles = conflictedStyles.map(style => {
      return {[style[0]]: Array.from(style[1].stylesheets)}
    })

    //console.log('conflictedStyles', conflictedStyles);

    if (conflictedStyles.length)
      conflictedElements.push({
        nodeName: item.nodeName,
        path: item.path,
        conflictedStyles: conflictedStyles
      })

    console.log('conflictedElements:', conflictedElements.length);

    if (conflictedElements.length)
      file.writeFileSync('public/conflictedcss.json', JSON.stringify(conflictedElements));

  })
}