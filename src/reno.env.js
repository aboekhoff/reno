function Env(dict, name) {
    this.dict = dict
    this.name = name
}

Env.SYMBOL_PREFIX = "S:"
Env.LABEL_PREFIX  = "L:"

Env.registry = {}

Env.load = function(name) {
    throw Error('not implemented')
}

Env.create = function(name) {
    return Env.registry[name] = new Env(new Dict(), name)
}

Env.findOrCreate = function(name) {
    if (!Env.registry[name]) {
	Env.registry[name] = new Env(new Dict(), name)
    }
    return Env.registry[name]
}

Env.findOrDie = function(name) {
    if (!Env.registry[name]) {
	throw Error('no environment registered under name: ' + name)
    }
    return Env.registry[name]
}

Env.toKey = function(obj) {
    if (obj == null) { return '' + obj }
    if (obj.toKey)   { return obj.toKey() }
    else             { return obj.constructor.name + "$" + obj.toString() }
}

Env.prototype = {
    extend: function() {
	return new Env(this.dict.extend(), this.name)
    },

    getWithPrefix: function(prefix, object, notFound) {	
	// qualified symbols are resolved in their own namespace	

	if (object instanceof Symbol.Qualified) {
	    return Env.
		findOrDie(object.namespace).
		getWithPrefix(prefix, new Symbol.Simple(object.name), notFound)	
	}

	// lookup all other objects as usual

	var key      = prefix + Env.toKey(object)
	var bindings = this.dict.seek(key)

	if (bindings) { 
	    return bindings[key] 
	}
	
	// when no binding is found and the object
	// is a tagged symbol, pull the environment and child symbol
	// from the tagged symbol and recurse

	if (object instanceof Symbol.Tagged) {
	    return object.tag.env.get(object.symbol, notFound)
	}

	// otherwise we give up

	else {
	    return notFound
	}

    },

    putWithPrefix: function(prefix, object, value) {
	this.dict.put(prefix + Env.toKey(object), value)
    },

    getSymbol: function(symbol, notFound) {
	return this.getWithPrefix(Env.SYMBOL_PREFIX, symbol, notFound)	
    },

    putSymbol: function(symbol, value) {
	this.putWithPrefix(Env.SYMBOL_PREFIX, symbol, value)
    },

    getLabel: function(label, notFound) {
	return this.getWithPrefix(Env.LABEL_PREFIX, label, notFound)
    },

    putLabel: function(label, value) {
	this.putWithPrefix(Env.LABEL_PREFIX, label, value)
    },

    createSanitizers: function() {
	var tag = new Symbol.Tag(this)    
	
	function applyTag(sexp) {
	    if (sexp instanceof Symbol) {
		return sexp.applyTag(tag)
	    }

	    if (sexp instanceof Array || sexp instanceof List) {
		return sexp.map(applyTag)
	    }

	    else {
		return sexp
	    }

	}

	function ensureTag(sexp) {
	    if (sexp instanceof Symbol) {
		return sexp.ensureTag(tag)
	    }

	    if (sexp instanceof Array || sexp instanceof List) {
		return sexp.map(ensureTag)
	    }

	    else {
		return sexp
	    }

	}

	return {
	    tag       : tag,
	    applyTag  : applyTag,
	    ensureTag : ensureTag
	}
    }

}
