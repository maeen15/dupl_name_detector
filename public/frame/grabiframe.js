var valCollector;

function getValuesCollected(){
	return JSON.stringify(valCollector);
}

(function() {

	var iframe = document.createElement('iframe');

	iframe.onload = function() {
		valCollector = Object.keys(iframe.contentWindow); 
	};

	iframe.src = 'about:blank';

	window.onload = function(){
		document.body.appendChild(iframe);
	}

})();
