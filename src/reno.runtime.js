// reno runtime support

var RT = {
    'reno::*out*' : process.stdout,
    'reno::List' : List,
    'reno::Symbol' : Symbol,
    'reno::Keyword' : Keyword,
    'reno::pr' : pr,
    'reno::prn' : prn,
    'reno::print' : print,
    'reno::println' : println,
    'reno::newline' : newline,    

    'reno::+' : function(x, y) {
	switch(arguments.length) {
	case 0: return 0
	case 1: return x
	case 2: return x + y
	default:
	    var r = x + y
	    var i = 2;
	    while (i<arguments.length) { r += arguments[i++] }
	    return r
	}
    },

    'reno::*' : function(x, y) {
	switch(arguments.length) {
	case 0: return 1
	case 1: return x
	case 2: return x * y
	default:
	    var r = x * y
	    var i = 2;
	    while (i<arguments.length) { r *= arguments[i++] }
	    return r
	}
    },

    'reno::-' : function(x, y) {
	switch(arguments.length) {
	case 0: throw Error('reno::- requires at least one argument')
	case 1: return -x
	case 2: return x - y
	default:
	    var r = x - y
	    var i = 2;
	    while (i<arguments.length) { r -= arguments[i++] }
	    return r
	}
    },

    'reno::/' : function(x, y) {
	switch(arguments.length) {
	case 0: throw Error('reno::/ requires at least one argument')
	case 1: return 1/x
	case 2: return x / y
	default:
	    var r = x/y
	    var i = 2;
	    while (i<arguments.length) { r /= arguments[i++] }
	    return r
	}
    },

    'reno::<' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('reno::< requires at least one argument')
	    case 1: return true
	    case 2: return x<y
	    default:
	    var r = x<y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x<y }
	    return r	    
	}
    },

    'reno::>' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('reno::> requires at least one argument')
	    case 1: return true
	    case 2: return x>y
	    default:
	    var r = x>y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x>y }
	    return r	    
	}
    },

    'reno::<=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('reno::<= requires at least one argument')
	    case 1: return true
	    case 2: return x<=y
	    default:
	    var r = x<=y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x<=y }
	    return r	    
	}
    },

    'reno::>=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('reno::>= requires at least one argument')
	    case 1: return true
	    case 2: return x>=y
	    default:
	    var r = x>=y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x>=y }
	    return r	    
	}
    },

    'reno::=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('reno::< requires at least one argument')
	    case 1: return true
	    case 2: return x===y
	    default:
	    var r = x===y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x===y }
	    return r	    
	}
    },

    'reno::mod' : function(x, y) {
	return x % y
    },

    'reno::div' : function(x, y) {
	return Math.floor(x/y)
    },

    'reno::array?' : Array.isArray,

    'reno::boolean?' : function(x) {
	return typeof x == 'boolean'
    },

    'reno::number?' : function(x) {
	return typeof x == 'number'
    },

    'reno::string?' : function(x) {
	return typeof x == 'string'
    },

    'reno::array' : function() {
	var len = arguments.length
	var arr = new Array(len)
	for (var i=0; i<len; i++) { arr[i] = arguments[i] }
	return arr
    },

    'reno::array*' : function() {
	var alen = arguments.length
	var b    = arguments[alen-1]
	var blen = b.length
	var arr = new Array(alen+blen-1)
	for (var i=0; i<alen-1; i++) { arr[i]   = arguments[i] }	
	for (var j=0; j<blen; j++)   { arr[i+j] = b[j] }
	return arr
    },

    'reno::concat' : function() {
	var res = []
	for (var i=0; i<arguments.length; i++) {
	    var xs = arguments[i]
	    if (xs) {
		for (var j=0; j<xs.length; j++) {
		    res.push(xs[j])
		}
	    }
	}
	return res
    },
   
    'reno::apply' : function(f) {
	var len  = arguments.length
	var more = arguments[len-1]
	var mlen = more.length
	var args = new Array((len-2) + mlen)

	for (var i=0; i<len-2; i++) {
	    args[i] = arguments[i+1]
	}

	for (var j=0; j<mlen; j++) {
	    args[i+j] = more[j]
	}

	return f.apply(null, args)
    }

}

function isa(obj, type) {    
    return obj == null ? false : Object(obj) instanceof type
}

function isTruthy(obj) { 
    return !(obj == null || obj === false) 
}

