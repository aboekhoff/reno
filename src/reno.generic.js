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
	p.write(x.namespace + "::" + x.name)
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

