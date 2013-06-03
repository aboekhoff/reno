// reno runtime support

var RT = {

    'reno::*load-path*' : [""],
    'reno::*env*'       : null,
    'reno::*out*'       : null /* defined at end of file */,
    'reno::window'      : null /* defined at end of file */,	
    
    'reno::macroexpand-1' : null,
    'reno::macroexpand' : null,
    'reno::expand' : null,

    'reno::List'    : List,
    'reno::Symbol'  : Symbol,
    'reno::Keyword' : Keyword,
    'reno::pr'      : pr,
    'reno::prn'     : prn,
    'reno::print'   : print,
    'reno::println' : println,
    'reno::newline' : newline,    

    'reno::symbol' : function(namespace, name) {
	switch(arguments.length) {
	case 1: 
	    name = namespace
	    namespace = null
	case 2: 
	    return namespace ?
		new Symbol.Qualified(namespace, name) :
		new Symbol.Simple(name)
	default:
	    throw Error(
		'reno::symbol requires 1 or 2 arguments but got ' + 
		    arguments.length
	    )
	}
    },

    'reno::keyword' : function(x) {
	if (x instanceof Keyword) {
	    return x
	} else {
	    return new Keyword('' + x)
	}
    },

    'reno::list' : List.create,
    'reno::array->list' : List.fromArray,

    'reno::acat' : function() {
	var res = []
	function push(x) { res.push(x) }
	for (var i=0; i<arguments.length; i++) {
	    if (arguments[i]) { arguments[i].forEach(push) }
	}
	return res
    },

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

    'reno::list?' : function(x) {
	return x instanceof List
    },

    'reno::symbol?' : function(x) {
	return x instanceof Symbol
    },

    'reno::keyword?' : function(x) {
	return x instanceof Keyword
    },

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
	var args = []

	for (var i=0; i<len-2; i++) {
	    args.push(arguments[i])
	}

	more.forEach(function(x) { args.push(x) })
	return f.apply(null, args)
    },   

    'reno::first'  : first,
    'reno::rest'   : rest,
    'reno::empty?' : isEmpty,
    'reno::cons'   : cons

}

function isa(obj, type) {    
    return obj == null ? false : Object(obj) instanceof type
}

function isTruthy(obj) { 
    return !(obj == null || obj === false) 
}

if (typeof process == 'undefined') {

    RT['reno::*out*'] = {
	buffer: "",

	write: function(txt) {
	    this.buffer += txt	    
	    var lines = this.buffer.split('\n')
	    for (var i=0; i<lines.length; i++) {
		if (i<lines.length-1) { 
		    console.log(lines[i]) 
		} else {
		    this.buffer = lines[i]
		}
	    }
	},

	flush: function() {
	    this.buffer.split('\n').forEach(function(line) {
		console.log(line)
	    })
	    this.buffer = ""
	}

    }

} else {

    RT['reno::*out*'] = process.stdout

}

if (typeof window != 'undefined') {
    RT['reno::window'] = window
} 

if (typeof __dirname != 'undefined') {
    var path = require('path')
    RT['reno::*load-path*'].push(path.dirname(process.argv[1]))
    RT['reno::*load-path*'].push(__dirname)
    RT['reno::slurp'] = function(filename) {
	var fs    = require('fs')
	var path  = require('path')
	var paths = RT['reno::*load-path*']
	for (var i=0; i<paths.length; i++) {
	    var abspath = path.join(paths[i], filename)
	    var stats   = fs.lstatSync(abspath)
	    if (stats.isFile()) { return fs.readFileSync(abspath, 'utf8') }
	}
	throw Error('file not found: ' + filename) 
    }
}
