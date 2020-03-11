var valCollector = [];
function injected(line, col, val){

 	//valCollector[0]++
	//if (valCollector[0] < 35) return val;

	//console.log( valCollector[0], 'intercepted at', line, col, val)

	var ggg, glob;

	if (typeof val === 'object' || typeof val === 'function'){

		ggg = getCurrentGlobals();
		ggg.find( v => {

			glob = isParentObject(window[v], val, v, 0);
			return glob	;
		});

		if (typeof val === 'function') ggg = 'Function';
		else ggg = 'object';

		//		console.log(line, col, ggg);
	} //else console.log(line, col, val);

	valCollector.push({
		line: line,
		col: col,
		val: glob || (ggg || val) || 'no value',
		g: !!glob
	});
/*
	$.ajax({
		method: "POST",
		url: "http://localhost:3000/api",
		data: {
			    cmd: 'test',
		    	data: { 
		    		line: line, 
		    		val: glob || (ggg || val) || 'no value' 
		    	}
		    } 
	})*/
	
	return val;
}

function isParentObject(obj1, obj2, prop, idx){
	// obj1 and obj2 should be an objects

	if (idx > 10) return false;
	if (!obj1 || !obj2) return false;
	if (obj1 === obj2) return prop;

	var c = prop.split('.');

	if (c[1] === 'cache' && c[3] === 'data') return false;

	//console.log('r', idx, prop)

	var p,
		k = Object.keys(obj1).find(key => {

				return (obj1.hasOwnProperty(key)) 
					? ((typeof obj1[key] === 'object' && !(obj1[key] instanceof Array)) 
							? p = isParentObject(obj1[key], obj2, prop+'.'+key, idx + 1)
							: false
						)
					: false
			});

	return p || k;	
}

function getValuesCollected(){
	return JSON.stringify(valCollector);
}

var reservedGlobals = new Set([	

		'iframeKeys', 'reservedGlobals', 
		'injected', 'valCollector', 
		'isParentObject', 'getCurrentGlobals', 'getValuesCollected'
	]);

function getCurrentGlobals(){

	return Object.getOwnPropertyNames(window)
				.filter(function(key) {

					return !iframeKeys.has(key) && key != 0 && !reservedGlobals.has(key)
				});
}

var targetNode = document.getElementsByTagName("html");
var observerOptions = {
  childList: true,
  attributes: true,
  subtree: true //Omit or set to false to observe only changes to the parent node.
}

var observer = new MutationObserver((mutationList, observer) => {
  mutationList.forEach((mutation) => {

  	//console.log(mutation.type, mutation);

    switch(mutation.type) {
      case 'childList':
        /* One or more children have been added to and/or removed
           from the tree; see mutation.addedNodes and
           mutation.removedNodes */
        break;
      case 'attributes':
        /* An attribute value changed on the element in
           mutation.target; the attribute name is in
           mutation.attributeName and its previous value is in
           mutation.oldValue */
        break;
    }
  });
});
observer.observe(targetNode[0], observerOptions);

window.onload = function(){
	setTimeout(function(){
		//console.log('globals: ' + JSON.stringify(getCurrentGlobals()));
		console.log('app started');
	}, 500)
}