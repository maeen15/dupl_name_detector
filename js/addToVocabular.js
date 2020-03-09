// vocabular helper
module.exports = function addToVocabular(voc, name, type, treeName, loc, patternType){

  // store each found name in voc vocabular
  // if name is already in a set, add a record about a file where it was found

  var entry,
      //short = name.replace('.prototype.', '.').replace('.__proto__.', '.');
      short = name.replace(/prototype./g, '').replace(/__proto__./g, '');

  if (type === 'jQuery') 
  {
    entry = short.split('.')
    entry[0] = '$'
    short = entry.join('.')
  } 
  else if (type === 'global') 
  {
    entry = short.split('.')
    if (entry[1]) short = entry[1]

  } 
  else if (type === 'object') 
  {
    if (badWords.some( w => ( short.indexOf(w) >= 0 )) || short !== name) return;

    entry = short.split('.');
    entry.pop();
    short = entry.join('.');
  } 
  else 
  {
    // some additional action for the rest?
  }

  //console.log('add', name, loc);

  if (voc.has( short )) 
  {

    entry = voc.get( short );
    
    if ( patternType === 'all' ||
         (type !== 'object' && !entry.occures.some( (item)=>{
            return item.file === treeName
         })) || 
         (type === 'object' && !entry.occures.some( (item)=>{
            return item.fullName === name
         }))
      ) 
      entry.occures.push( { 
                            type: type,
                            pattern: patternType,
                            fullName: short === name ? '""' : name,
                            file: treeName,
                            loc: loc, //{ start: { pos: start || ''}},
                            start: loc ? loc.start.pos : ''
                          } );

  } 
  else 
  {
    entry = {
              name: short,
              occures: [ { 
                            type: type, 
                            pattern: patternType,
                            fullName: short === name ? '""' : name,
                            file: treeName,
                            loc: loc, //{ start: { pos: start || ''}},
                            start: loc ? loc.start.pos : ''
                          } ]
            };
    voc.set( short, entry );

  }
}