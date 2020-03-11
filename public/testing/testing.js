/*!
Test patterns file
*/

// define global object
// catch static: AGlobalVar as Global
var AGlobalVar = {
	level2: {
		level3: 'sss'
	}
};

// catch static: dummyGlobal as Global
function dummyGlobal(){}

(function(a, b){

	// @a: jQuery
	// @b: window 

	function dummy(){}

	var dummyObj = {};

	// catch static: someglobalvar as Global
	b.someglobalvar = 3;

	// catch static: autoGlobalVar as Global
	autoGlobalVar = 6;

	for (autoGlobalVar2 in dummyObj){

	}

	for (let exclude6 in dummyObj){
		exclude6 = 8;
	}

	// assign object 
	// catch static: $.fn.test1s, not $.fn.test2s
	$.fn.test1s = {

				// chained assingment with property value
				// catch static: $.fn.test3s
				test2s : $.test3s = function() {
							return this
						}
			};

	// catch static: $.fn.test4s
	$.fn.test4s = function(){ 

		// test SequenceExpression in return statement
		// catch static: $.fn.test5s
		return $.fn.test5s = function(){ return this }, this;
	};

	// pattern = argument is a jQuery + duplicated assignment
	// catch static: one $.fn.test6s, 
	a.fn.test6s = function(){ return this };
	a.fn.test6s = function(){ return this };

	if (autoGlobalVar) $.fn.test77s = function(){ return this };

	// test SequenceExpression in conditional statement
	if (autoGlobalVar) 
		dummy(),
		// catch static: $.fn.test7s 
		$.fn.test7s = function(){ return this },
		dummy();
	else 	
		dummy(),
		// catch static: $.fn.test8s
		a.fn.test8s = function(){ return this },
		dummy();


	jQuery.each( [
		"ajaxStart",
		// catch static: $.fn.test9s 
		$.test9s = "ajaxStop",
		"ajaxComplete"
	], function( i, type ) {
		return this
	});

	// literal in computed property
	// catch static: $.fn.test10s 
	$.fn['test10s'] = function(){ return this };

	// chained assignment in declarations +
	var dummyVar =
		// catch static: $.fn.test11s
		$.fn.test11s = {
			test12s: function() { return this }
		};

	//	assignment in a function call
	dummy( $.fn.test13s = 'something');

	// assignProperty
	// catch static: $.test14s
	Object.defineProperty($, 'test14s', { value: 'value'});
	// catch static: $.test15s
	Object.defineProperties($, { test15s: { value: 'value'}} );
    // catch static: $.test16s, $.test17s
    Object.assign($, { test16s: 'value'},{ test17s: 'value'});

	// catch static: $.fn.test18s
	$.fn.extend({
		test18s: function() {
			return this.each(function() {
				injected(113,4,this),this.checked = true;
			});
		}
	});


		//a.fn.prototype.testProto = function(){ return this };
		//a.fn.prototype.prototype.testProto2 = function(){ return this };

		//$.xn.xxx = function(){ return this };
        //$.xn.prototype.xxx = function(){ return this };
        //$.xn.__proto__.xxx = function(){ return this };
        //$.xn.prototype.prototype.xxx = function(){ return this }
	

//***************** Dynamic **********************

	var jQcopy = a;
	var FN = a.fn;

	// catch dynamic: $.fn.testAd,
	injected(134,1,jQcopy.fn),jQcopy.fn.testAd = function(){ return this };

	if (autoGlobalVar) 
		dummy(),
		// catch dynamic: $.fn.testBd,
		injected(139,2,jQcopy.fn),jQcopy.fn.testBd = function(){ return this },
		dummy();

	//******* computed property at member expression
	var lett;
	lett = 'testCd';

	// catch dynamic: $.fn.testCd
	$.fn[injected(147,6,lett)] = function( method ) {
		
		return this;
	};

	// catch dynamic: $.fn.testDd, $.fn.testEd
	jQuery.each( [
		"testDd",
		"testEd"
	], function( i, type ) {
		let t = type,
			fn = 'fn';
		//
		//............
		// multiple computed properties
		jQuery[injected(162,9,fn)][ injected(162,14,t) ] = function( fn ) {
			return this.on( type, fn );
		};
	});

	// test member expression in SequenceExpression
	function testF() {
		
		return dummy(), 
				// catch dynamic: $.fn.testFd
				injected(172,4,jQcopy.fn),jQcopy.fn.testFd = function(){ return this }, 
				this;
	};
	testF();

		
	// dummy obj structure
	// catch static: $.b	
	$.b = {
		ccc: {
			d: {
				e: {
					f: {
						ggg: {}
					}
				}
			}
		}
	}

	var c = 'ccc', g = 'ggg';

	// test multiple computed property
	// catch dynamic: $.b.ccc.d.e.f.ggg.n
	$.b[injected(196,5,c)].d.e.f[injected(196,14,g)].n = '5';


    var lev='level2', 
    	new2 = 'newmethod2',
    	new4 = function() {	return 'newmethod4'},
    	exclude2 = 'exclude2',
    	mm = AGlobalVar,
		ff = mm[lev];

	// modifying a global object
	// catch dynamic: AGlobalVar.newmethod
	injected(208,1,mm),mm.newmethod = function(){};

	// catch dynamic: AGlobalVar.level2.newmethod2
	injected(211,1,ff),ff[injected(211,4,new2)] = function(){};

	// exclude2 should not be captured
	injected(214,1,dummyObj),dummyObj[injected(214,10,exclude2)]  = function(){};

	// catch dynamic: AGlobalVar.level2.newmethod3
	injected(217,1,mm.level2),mm.level2.newmethod3 = function(){};

	// catch dynamic: AGlobalVar.level2.newmethod4
	injected(220,1,mm.level2),mm.level2[new4()] = function(){};

	// exclude3, exclude4, exclude5 should not be captured
	injected(223,1,dummyObj),dummyObj.exclude3 = function(exclude4){ 
		var exclude5;
		exclude4 = '';
		exclude5 = '';
	};


	function testFF() {

		// computed property and member expression in chained assignment in variable declarations
		var tt = 'testJd',
			ttt = 'testGd',
			dummy1583888935698=injected(235,3,jQcopy.fn),dummyVar =
				// catch dynamic: $.fn.testGd
				$.fn[injected(237,9,ttt)] =
					// catch dynamic: $.fn.testId
					jQcopy.fn.testId = function() { return this };

		// combined - computed property and unknown member expresiion		
		return dummy(),
			// catch dynamic: $.fn.testJd
			injected(244,3,jQcopy.fn),jQcopy.fn[injected(244,13,tt)] = function() { return this },
			// catch dynamic: AGlobalVar.testGd
			injected(246,3,mm),mm[injected(246,6,ttt)] = function() { return this },
			this;
	};
	testFF();

	//	assignment in a function call
	injected(252,1,jQcopy.fn),dummy( jQcopy.fn.testKd = 'something');

	// catch dynamic $.fn.testLd
	injected(255,1,FN),FN.testLd = function(){ return this };

	// ****** eval test
	function injector(t) {
		// missed in dynamic
		eval('function xx(){return "this is unaccesible value for eval"}');
	}
	// catch dynamic
	eval('function xx(){return "this is value for eval"}');	

})(jQuery, window);


// multiple functions scopes in app root
(function(j){
	// @j: jQuery

	// catch static: $.testZ
	j.testZ = function(){ return this };

	// catch static: anotherglobal as Global
	anotherglobal = function(){ return this };

	function thisChange(){
		injected(279,2,this),this.testZZ = 'z';
	}

    // catch dynamic: $.testZZ
	thisChange.call(j);

})(jQuery, window);	
