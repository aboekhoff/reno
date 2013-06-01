!(function() {

// BEGIN reno.list.js

function List() {}

List.Nil = function Nil() {} 

List.Cons = function Cons(head, tail) { 
    this.head = head; 
    this.tail = tail;
}

List.Nil.prototype = new List()
List.Cons.prototype = new List()

List.fromArray = function(array) {
    var ls = new List.Nil()
    var i = array.length
    while (i--) { ls = new List.Cons(array[i], ls) }
    return ls
}

List.create = function() {
    return List.fromArray(arguments)
}

List.Nil.prototype.isEmpty = function() { return true }
List.Cons.prototype.isEmpty = function() { return false }

List.Nil.prototype.first = function() { throw Error('Nil.first') }
List.Cons.prototype.first = function() { return this.head } 

List.Nil.prototype.rest = function() { throw Error('Nil.rest') }
List.Cons.prototype.rest = function() { return this.tail }

List.Nil.prototype.cons = function(x) { return new List.Cons(x, this) }
List.Cons.prototype.cons = function(x) { return new List.Cons(x, this) }

List.Nil.prototype.map = function(f) { return this }
List.Cons.prototype.map = function(f) { 
    return new List.Cons(f(this.head), this.tail.map(f))
}

List.Nil.prototype.filter = function(f) { return this } 
List.Cons.prototype.filter = function(f) {
    var obj  = this.head
    var keep = isTruthy(f(this.head))
    var tail = this.tail.filter(f)
    return keep ? new List.Cons(obj, tail) : tail
}

List.Nil.prototype.forEach = function(f) {}
List.Cons.prototype.forEach = function(f) {
    var ls = this
    while (ls instanceof List.Cons) { 
	f(ls.head)
	ls = ls.tail
    }
}

List.Nil.prototype.toArray = function() { return [] }
List.Cons.prototype.toArray = function() {
    var arr = []
    var ls  = this
    while (ls instanceof List.Cons) { 
	arr.push(ls.head)
	ls = ls.tail
    }
    return arr
}

List.Nil.prototype.concat = function(ls) {
    return ls
}

List.Cons.prototype.concat = function(ls) {
    return this.tail.concat(ls).cons(this.head)
}


// END reno.list.js

// BEGIN reno.symbol.js

function Symbol() {
}

Symbol.Simple = function(name) {
    this.name = name
}

Symbol.Qualified = function(namespace, name) {
    this.namespace = namespace
    this.name      = name
}

Symbol.Tagged = function(tag, symbol) { 
    this.tag    = tag
    this.symbol = symbol
}

Symbol.Tag = function(env) {
    this.env = env
    this.id  = Symbol.Tag.nextId++
} 

Symbol.Tag.nextId = 0

Symbol.Simple.prototype = new Symbol()
Symbol.Tagged.prototype = new Symbol()
Symbol.Qualified.prototype = new Symbol()

Symbol.builtin = function(name) {
    return new Symbol.Qualified('reno', name)
}

// toKey

Symbol.prototype.toKey = function() {
    return 'Symbol$' + this._toKey()
}

Symbol.Simple.prototype._toKey = function() {
    return "#" + this.name
}

Symbol.Tagged.prototype._toKey = function() {
    return this.tag.id + ":" + this.symbol._toKey()
}

Symbol.Qualified.prototype._toKey = function() {    
    // qualified symbols are resolved in the namespace
    // that corresponds to their qualifier
    // for the purposes of the compiler calls to _toKey should be errors
    throw Error('qualified symbols cannot be coerced to keys')
}

// reify

Symbol.Simple.prototype.reify = function() {
    return this
}

Symbol.Tagged.prototype.reify = function() {
    return new Symbol.Simple(this._toKey())
}

Symbol.Qualified.prototype.reify = function() {
    return new Symbol.Simple(this.name)
}

// qualify

Symbol.Simple.prototype.qualify = function(namespace) {
    return new Symbol.Qualified(namespace, this.name)
}

Symbol.Tagged.prototype.qualify = function() {
    throw Error('cannot qualify tagged symbol')
}

Symbol.Qualified.prototype.qualify = function() {
    throw Error('cannot qualify qualified symbol')
}

// toString

Symbol.Simple.prototype.toString = function() {
    return this.name
}

Symbol.Tagged.prototype.toString = function() {
    return this.symbol.toString()
}

Symbol.Qualified.prototype.toString = function() {
    return this.namespace + "::" + this.name
}

// applyTag

Symbol.Simple.prototype.applyTag = function(tag) {
    return new Symbol.Tagged(tag, this)
}

Symbol.Tagged.prototype.applyTag = function(tag) {
    return (tag == this.tag) ?
	this.symbol :
	new Symbol.Tagged(tag, this)
}


Symbol.Qualified.prototype.applyTag = function(tag) {
    return this
}

// ensureTag (for forcing symbol capture through sanitizer)

Symbol.Simple.prototype.ensureTag = function(tag) {
    return new Symbol.Tagged(tag, this)
}

Symbol.Tagged.prototype.ensureTag = function(tag) {
    return (tag == this.tag) ?
	this :
	new Symbol.Tagged(tag, this)
}


Symbol.Qualified.prototype.ensureTag = function(tag) {
    return this
}

// END reno.symbol.js

// BEGIN reno.keyword.js

// Keywords are fantastically handy creatures

function Keyword(name) {
    this.name = name
}

Keyword.interns = {}

Keyword.create = function(name) {
    if (!(name in Keyword.interns)) {
	Keyword.interns[name] = new Keyword(name)
    } 
    return Keyword.interns[name]
}

Keyword.prototype.toString = function() {
    return this.name
}

// END reno.keyword.js

// BEGIN reno.generic.js

// still not sure if we want to implement these in javascript or not
// but they make writing printers much easier

var GENERIC_KEY = 'reno::generic-key'
var DEFAULT_KEY = 'reno::generic-default'
var CUSTOM_NAME = 'reno::name'

function Generic(options) {
    var index = options.index || 0
    var name  = options.name || null
    var key   = Generic.createKey(name) 

    function generic() {
	var dispatcher = arguments[index]
	var receiver   = dispatcher == null ? Generic.Null : dispatcher
	var method     = receiver[key] || generic['reno::generic-default']
	return method.apply(this, arguments)
    }
    
    generic['reno::generic-key'] = key
    generic['reno::name'] = name    
    generic['reno::generic-default'] = function() {
	var dispatcher = arguments[index]
	var typename   = dispatcher == null ? "#nil" : dispatcher.constructor.name
	throw Error('no implementation of generic function ' + name + 
		    ' for type ' + typename)
    }

    return generic

}

Generic.Null = {}

Generic.nextId = 1

Generic.createKey = function(suffix) {
    var key = "reno::generic[" + this.nextId++ + "]"
    return suffix ? key + suffix : key
}

Generic.addMethod = function(gfn, type, impl) {
    if (('' + type) == 'default') {
	gfn['reno::generic-default'] = impl
    } 

    else {
	var prototype  = (type == null) ? Generic.Null : type.prototype
	var key        = gfn['reno::generic-key']
	prototype[key] = impl 
    }
} 

Generic.addMethods = function(gfn) {
    for (var i=1; i<arguments.length;) {
	Generic.addMethod(gfn, arguments[i++], arguments[i++])
    }
    return gfn
}

var _print = Generic({ name: "print*" })

function _print_sequence(xs, p, e, sep) {
    sep = sep || " "    
    var flag = false
    for (var i=0; i<xs.length; i++) {
	if (flag) { p.write(sep) } else { flag = true }
	_print(xs[i], p, e)
    }
}

Generic.addMethods(
    _print,

    'default', function(x, p, e) {
	var cnst = x.constructor
	var name = cnst ? cnst['reno::name'] || cnst.name : null
	name = name || 'Object'
	p.write("#<" + name + ">")
    },

    null, function(x, p, e) {
	p.write("#nil")
    },

    Boolean, function(x, p, e) {
	p.write(x.valueOf() ? "#t" : "#f")
    },

    Number, function(x, p, e) {
	p.write(x.toString())
    },    

    String, function(x, p, e) {
	p.write(e ? JSON.stringify(x) : x.valueOf())
    },

    Function, function(x, p, e) {
	p.write("#<fn")
	var name = x['reno::name'] || x.name
	if (name) { p.write(":" + name) }
	p.write(">")
    },

    Array, function(xs, p, e) {
	p.write("[")
	_print_sequence(xs, p, e)
	p.write("]")
    },

    List.Nil, function(xs, p, e) {
	p.write("()")
    },

    List.Cons, function(xs, p, e) {
	var head = xs.first()

	if (head instanceof Symbol.Qualified &&
	    head.namespace == 'reno' &&
	    head.name == 'quote') {
	    p.write("'")
	    _print(xs.rest().first(), p, e)
	} 

	else {
	    p.write("(")
	    _print_sequence(xs.toArray(), p, e)
	    p.write(")")	
	}

    },

    Symbol.Qualified, function(x, p, e) {
	p.write("##" + x.namespace + "#" + x.name)
    },

    Symbol.Tagged, function(x, p, e) {
	p.write(x.symbol)
    },

    Symbol.Simple, function(x, p, e) {
	p.write(x.name)
    },

    Keyword, function(x, p, e) {
	p.write(":" + x.name)
    }

)

function newline() {
    RT['reno::*out*'].write('\n')
}

function pr() {
    _print_sequence(arguments, RT['reno::*out*'], true)
}

function prn() {
    _print_sequence(arguments, RT['reno::*out*'], true)
    newline()
}

function print() {
    _print_sequence(arguments, RT['reno::*out*'], false)
}

function println() {
    _print_sequence(arguments, RT['reno::*out*'], false)
    newline()
}


// END reno.generic.js

// BEGIN reno.runtime.js

// reno runtime support

var RT = {

    'reno::*env*'  : null,
    'reno::*out*'  : null /* defined at end of file */,
    'reno::window' : null /* defined at end of file */,	
    
    'reno::macroexpand-1' : null,
    'reno::macroexpand' : null,
    'reno::expand' : null,

    'reno::List' : List,
    'reno::Symbol' : Symbol,
    'reno::Keyword' : Keyword,
    'reno::pr' : pr,
    'reno::prn' : prn,
    'reno::print' : print,
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

    'reno::first'  : function(xs) { return xs.first() },
    'reno::rest'   : function(xs) { return xs.rest() },
    'reno::empty?' : function(xs) { return xs.isEmpty() },
    'reno::cons'   : function(x, xs) { return xs.cons(x) }

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

RT['reno::window'] = typeof window == 'undefined' ? null : window
    


// END reno.runtime.js

window.RT = RT

})()