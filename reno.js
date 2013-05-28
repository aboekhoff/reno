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

// BEGIN reno.dict.js

// extensible dictionaries (linked lists of maps)
// are useful for representing environments

function Dict(bindings, parent) {
    this.bindings = bindings || {}
    this.parent   = parent   || null
}

Dict.create = function() {
    return new Dict({}, null)
}

Dict.prototype = {
    seek: function(key) {
	var dict = this
	var key  = '' + key
	while (dict) {
	    if (key in dict.bindings) {
		return dict.bindings
	    } else {
		dict = dict.parent
	    }
	}
	return null
    },

    has: function(key) {
	return !!this.seek(key)
    },

    get: function(key, notFound) {
	var bindings = this.seek(key)
	return bindings ? bindings[key] : notFound
    },

    put: function(key, val) {
	this.bindings[key] = val
    },

    extend: function() {
	return new Dict({}, this)
    }

}




// END reno.dict.js

// BEGIN reno.env.js

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
    }

}


// END reno.env.js

// BEGIN reno.reader.js

// FIXME (add back support for qualified symbols and keywords)

function Position(offset, line, column, origin) {
    this.offset = offset;
    this.line   = line;
    this.column = column;
    this.origin = origin;
}

Position.prototype.toString = function() {
    return "line " + this.line   + ", " +
	"column " + this.column + ", " +
	"at "     + (this.origin || "unknown location");
};

function Reader() {	
    this.input  = null;
    this.offset = 0;
    this.line   = 1;
    this.column = 1;
    this.origin = "unknown";
}

Reader.create = function(options) {
    var reader   = new Reader();
    options = options || {}
    reader.input  = options.input  || null
    reader.origin = options.origin || null
    return reader;
}

Reader.hexRegex    = /0(x|X)[0-9a-fA-F]+/;
Reader.octRegex    = /0[0-7]+/;
Reader.intRegex    = /[0-9]+/;
Reader.floatRegex  = /[0-9]+\.[0-9]+/;
Reader.binaryRegex = /0(b|B)[01]+/;

Reader.escapeMap = {
    'n'  : '\n',
    'r'  : '\r',
    'f'  : '\f',
    'b'  : '\b',
    't'  : '\t',
    '"'  : '"',
    '\\' : '\\'
};

Reader.notTerminal = function(c) {
    switch (c) {
    case ' ':
    case '\t':
    case '\n':
    case '\r':
    case '\f':
    case ';':
    case '(':
    case ')':
    case '[':
    case ']':
    case '"':
    case "'":
    case '`':
	return false;
    default:
	return true;
    }
};

Reader.prototype = {
    constructor: Reader,

    makeList: function(list, position) {
	list = List.fromArray(list)
	if (position) { list['source-position'] = position }
	return list
    },

    makeArray: function(array, position) {
	if (position) { array['source-position'] = position }
	return array
    },

    reset: function(input, origin) {
	this.input  = input;
	this.origin = origin;
	this.offset = 0;
	this.line   = 1;
	this.column = 1;
    },

    loadPosition: function(position) {
	this.offset = position.offset;
	this.line   = position.line;
	this.column = position.column;
	this.origin = position.origin;		
    },

    getPosition: function() {
	return new Position(
	    this.offset,
	    this.line,
	    this.column,
	    this.origin
	);
    },

    isEmpty: function() {
	this.readWhitespace();
	return this.offset >= this.input.length;
    },

    peek: function() {
	return this.input[this.offset];
    },

    pop: function() {
	var c = this.peek();
	this.offset++;
	return c;
    },

    popWhile: function(pred) {
	var s = [];
	for(;;) {
	    var c = this.peek();
	    if (c == null || !pred(c)) { break; }
	    s.push(this.pop());
	}
	return s.join("");
    },

    readWhitespace: function() {
	var inComment = false;
	loop:for(;;) {
	    var c = this.peek();
	    if (c == null) { return; }

	    switch(c) {
	    case ';' : 
		inComment = true; 
		this.pop(); 
		continue loop;

	    case '\n': 
	    case '\r':
	    case '\f': 
		inComment = false;

	    case ' ' :
	    case '\t':
		this.pop();
		continue loop;

	    default:
		if (inComment) { 
		    this.pop(); 
		} else {
		    return;
		}
		
	    }
	}
    },

    readSexp: function() {
	this.readWhitespace();
	var nextChar = this.peek();

	switch (nextChar) {
	case ')': this.syntaxError('unmatched closing paren');
	case ']': this.syntaxError('unmatched closing brace');
	case '(': return this.readList();
	case '[': return this.readArray();
	case '"': return this.readString();
	case "'": return this.readQuote();
	case ',': return this.readUnquote();
	case '`': return this.readQuasiquote();
	default:  return this.readAtom();
	}
    },

    readQuote: function() {
	var position = this.getPosition();
	this.pop();
	return this.makeList(
	    [Symbol.builtin('quote', position),
	     this.readSexp()], 
	    position);
    },

    readQuasiquote: function() {
	var position = this.getPosition();
	this.pop();
	return this.makeList(
	    [Symbol.builtin('quasiquote'),
	     this.readSexp()],
	    position);		
    },

    readUnquote: function() {
	var position = this.getPosition();
	var name     = 'unquote';
	this.pop();

	if (this.peek() == '@') {
	    this.pop();
	    name = 'unquote-splicing';
	}				

	return this.makeList(
	    [Symbol.builtin(name), this.readSexp()]
	)

    },

    readArray: function() {
	var position = this.getPosition();		
	var list     = [];
	this.pop();

	loop:for(;;) {			
	    this.readWhitespace();
	    var c = this.peek();
	    switch(c) {

	    case null: 
		this.error('unclosed array-literal', position);
		
	    case ']': 
		this.pop(); 
		return this.makeArray(list, position);

	    default: 
		list.push(this.readSexp()); continue loop;
	    }
	}
    },

    readList: function() {
	var position = this.getPosition();		
	var list     = [];
	this.pop();

	loop:for(;;) {			
	    this.readWhitespace();
	    var c = this.peek();
	    switch(c) {
	    case null: 
		this.error('unclosed list', position);

	    case ')': 
		this.pop(); return this.makeList(list, position);

	    default: 
		list.push(this.readSexp()); continue loop;
	    }
	}
    },

    readString: function() {
	var position = this.getPosition();
	var string   = [];
	this.pop();
	loop:for(;;) {
	    var c = this.pop();
	    switch(c) {
	    case null: this.error('unclosed string literal', position);
	    case '"' : return string.join("");
	    case '\\':
		var position2 = this.getPosition();
		var cc = this.escapeMap[this.pop()];
		if (!cc) { this.error('invalid escape character', position2); }
		this.string.push(cc);
		continue;
	    default:
		string.push(c);
		continue;
	    }
	}
    },

    parseNumber: function(string, position) {
	var sign = 1;
	if (string[0] == '-') {
	    sign   = -1;
	    string = string.substring(1);
	}

	switch (true) {
	case Reader.floatRegex.test(string)  : return sign * parseFloat(string);
	case Reader.hexRegex.test(string)    : return sign * parseInt(string, 16);
	case Reader.octRegex.test(string)    : return sign * parseInt(string, 8);
	case Reader.binaryRegex.test(string) : return sign * parseInt(string, 2);
	case Reader.intRegex.test(string)    : return sign * parseInt(string, 10);
	default:
	    throw Error('invalid number literal at ' + position);
	}
    },

    parseSymbol: function(string, position) {
	if (string[0] == ":") {
	    return Keyword.create(string.substring(1))
	}

	else if (/##[^#]+#[^#]+/.test(string)) {
	    var segments = string.substring(2).split(/#/)
	    return new Symbol.Qualified(segments[0], segments[1])
	}

	else {
	    return new Symbol.Simple(string)
	}
	
    },

    readAtom: function() {
	var position = this.getPosition();
	var string   = this.popWhile(Reader.notTerminal);

	switch (string) {
	case '#t'    : return true;
	case '#f'    : return false;
	case '#nil'  : return null;
	// case '#void' : return undefined;	    
	}	

	if (/\d|(-\d)/.test(string)) {
	    return this.parseNumber(string, position);
	} else {
	    return this.parseSymbol(string, position);
	}

    }    

};


// END reno.reader.js

// BEGIN reno.expander.js

function macroexpand1(e, x) {
    var macro = maybeResolveToMacro(e, x)
    return macro ? macro(e, x) : x
}

function macroexpand(e, x1) {
    var x2 = macroexpand1(e, x1)
    return x1 === x2 ? x2 : macroexpand1(e, x2)   
}

function maybeResolveToMacro(e, x) {
    if (x instanceof List.Cons &&	
	x.first() instanceof Symbol) {
	var denotation = e.getSymbol(x)
	if (typeof denotation == 'function') {
	    return denotation
	}
    }    
    return null
}

function maybeResolveToSpecialForm(e, x) {
    if (x instanceof List.Cons && (x.first() instanceof Symbol)) {
	var denotation = e.getSymbol(x.first())
	if (typeof denotation == 'string') {
	    return denotation
	}
    }    
    return null
}

function maybeResolveToDo(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'do'
}

function maybeResolveToDefine(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'define*'
}

function maybeResolveToDefineMacro(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'define-macro*'
}

function bindLabel(e, x) {
    var _x = x instanceof Symbol ? x.reify() : x
    e.putLabel(x, _x)
    return _x
}

function bindLocal(e, s) {
    var rs = s.reify()
    e.putSymbol(s, rs)
    return rs
}

function bindGlobal(e, s) {
    var rs = s.reify()
    var qs = rs.qualify(e.name)
    Env.findOrDie(e.name).putSymbol(s, qs)
    return qs
}

function expandSexp(e, x) {
    x = macroexpand(e, x)

    if (x instanceof Symbol) {
	return expandSymbol(e, x)
    }

    if (x instanceof List) {
	return expandList(e, x)
    }

    if (x instanceof Array) {
	return expandSexps(e, x)
    }

    else {
	return x
    }
}

function expandSexps(e, xs) {
    return xs.map(function(x) { return expandSexp(e, x) })
}

function expandSymbol(e, s) {
    var denotation = e.getSymbol(s)

    switch (typeof denotation) {
    case 'string'   : throw Error("can't take value of special form: " + s)
    case 'function' : throw Error("can't take value of macro: " + s)
    default:  	      return denotation || bindGlobal(e, s)
	    
    }

}

function expandLabel(e, l) {
    var denotation = e.getLabel(l)
    if (!denotation) {
	throw Error('label not in scope: ' + l)
    }
    else {
	return denotation
    }
}

function expandList(e, x) {
    var n = maybeResolveToSpecialForm(e, x)
    return n ? expandSpecialForm(e, x, n) : expandCall(e, x)
}

function isFrontDotted(x) {
    return (x instanceof Symbol) &&
	   (/\.[^\.]+/.test(x.toString())) 	
}

function expandCall(e, x) {
    if (isFrontDotted(x.first())) {
	return expandFrontDottedList(e, x)
    } else {
	return expandSexps(e, x)
    }
}

// internal body expansion helpers
// first splice together any do forms

function expandBody(e, xs) {
    var exprs = []
    var defs  = []
    var mode  = 'definition'
    var x

    loop:while (!xs.isEmpty()) {	

	x  = macroexpand(e, xs.first())
	xs = xs.rest()

	// if it's a do form we splice in the expressions and continue

	if (maybeResolveToDo(e, x)) {
	    xs = x.rest().concat(xs)
	    continue loop
	}

	if (maybeResolveToDefine(e, x)) {
	    if (mode == 'definition') {
		var sym  = x.rest().first()
		var expr = x.rest().rest().first() 
		
		sym = bindLocal(e, sym)	
		defs.push(List.create(sym, expr))
		continue loop

	    } else {
		exprs.push(expandBody(e, xs.cons(x)))
		break loop
	    }
	}


	{	    
	    mode = 'expression'
	    exprs.push(expandSexp(e, x))
	    continue loop
	}

    }    

    if (defs.length > 0) {
	defs = defs.map(function(pair) {
	    var sym  = pair.first()
	    var expr = pair.rest().first()
	    return List.create(sym, expandSexp(e, expr))
	})
    }

    if (defs.length > 0) {
	return List.fromArray(exprs).
	    cons(List.fromArray(defs)).
	    cons(Symbol.builtin('letrec*'))
    }

    {
	switch(exprs.length) {
	case 0:  return null
	case 1:  return exprs[0]
	default: return List.fromArray(exprs).cons(Symbol.builtin('do'))
	}
    }

}

function expandFn(e, args, body) {
    e = e.extend()

    args = args.map(function(arg) {
	return arg instanceof Symbol ?
	    bindLocal(e, arg) :
	    arg
    })

    body = expandBody(e, body)

    return List.create(Symbol.builtin('fn*'), args, body)
    
}

function expandLet(e, bindings, body) {
    e = e.extend()

    if (bindings instanceof List.Cons) {

	bindings = bindings.map(function(binding) {
	    var sym  = binding.first()
	    var expr = binding.rest().first()
	    expr = expandSexp(e, expr)
	    sym  = bindLocal(e, sym)
	    return List.create(sym, expr)
	}) 
    
    }

    body = expandBody(e, body)
    
    return List.create(
	Symbol.builtin('let*'),
	bindings,
	body
    )
    
}

function expandLetrec(e, bindings, body) {
    e = e.extend()

    if (bindings instanceof List.Cons) {

	bindings = bindings.map(function(binding) {
	    var sym  = binding.first()
	    var expr = binding.rest().first()
	    sym      = bindLocal(e, sym)
	    return List.create(sym, expr)
	})

	bindings = bindings.map(function(binding) {
	    var sym  = binding.first()
	    var expr = binding.rest().first()
	    expr     = expandSexp(e, expr)
	    return List.create(sym, expr)
	})

    }

    body = expandBody(e, body)

    if (bindings instanceof List.Cons) {
	return List.create(Symbol.builtin('letrec*'), bindings, body)
    }

    else {
	return body
    }

}

function expandQuote(e, x) {}
function expandQuasiquote(e, x) {}

function expandSpecialForm(e, x, n) {

    switch (n) {

    case 'define*':
	throw Error('define* in expression context')

    case 'define-macro*':
	throw Error('define-macro* outside of top-level')

    case 'quote':
	return x.rest().cons(Symbol.builtin('quote'))

    case 'quasiquote':
	return expandQuasiquote(x.rest().first())

    case 'unquote':
	throw Error('unquote outside of quasiquote')

    case 'unquote-splicing':
	throw Error('unquote-splicing outside of quasiquote')

    case 'fn*':
	return expandFn(e, x.rest().first(), x.rest().rest())

    case 'do':
	return expandBody(e, x.rest())

    case 'if':
	return expandSexps(e, x.rest()).cons(Symbol.builtin('if'))

    case 'set':
	return expandSexps(e, x.rest()).cons(Symbol.builtin('set'))

    case '.':
	return expandSexps(e, x.rest()).cons(Symbol.builtin('.'))

    case 'let*':
	return expandLet(e, x.rest().first(), x.rest().rest())

    case 'letrec*':
	return expandLetrec(e, x.rest().first(), x.rest().rest())

    case 'block':
	e = e.extend()
	var label = bindLabel(e, x.rest().first())
	var body  = expandBody(e, x.rest().rest())
	return List.create(
	    Symbol.builtin('block'),
	    label,
	    body
	)

    case 'loop':
	e = e.extend()
	bindLabel(e, null)
	var body = expandBody(e, x.rest())
	return body.cons(Symbol.builtin('loop'))

    case 'return-from':
	return List.create(
	    Symbol.builtin('return-from'),
	    expandLabel(e, x.rest().first()),
	    expandSexp(e, x.rest().rest().first())
	)

    case 'throw':
	return 

    case 'unwind-protect':
	throw Error('not implemented')

    case 'import':
	throw Error('not implemented')

    case 'js*':
	return expandSexp(e, x.rest().first()).cons(Symbol.builtin('js*'))

    }

}


// END reno.expander.js

// BEGIN reno.normalizer.js

// transforms the adhoc s-sexpression trees into
// fake tagged unions of the form [TAG data_1 ... data_n]
// so that the compiler can focus on semantics
// also does some final conversion of quoted symbols and keyword literals

function maybeBuiltin(obj) {
    return obj instanceof Symbol.Qualified &&
	   obj.namespace == 'reno'
}

function normalizeBinding(pair) {
    return [normalize(pair.first()), normalize(pair.rest().first())]
}

function normalizeBindings(bindings) {
    return bindings.map(normalizeBinding).toArray()
}

function normalizeSeq(seq) {
    return seq.map(normalize)
}

function normalizeLabel(obj) {
    return ['LABEL', Env.toKey(obj)]
}

function normalizeFn(args, body) {
    body = normalize(body)

    var pargs = []
    var rest  = null
    var self  = null

    var i=0;
    while(i<args.length) {
	var arg = args[i++]

	if (arg instanceof Symbol) {
	    pargs.push(normalize(arg))
	} 

	if (arg instanceof Keyword) {
	    var key = arg
	    var arg = normalize(args[i++])
	    switch (key.name) {
	    case 'rest':
		rest = arg
		break
	    case 'this':
		self = arg
		break
	    }
	}
    }        

    if (rest || self) {
	body = [body]
	if (rest) { body.unshift(['RESTARGS', rest, pargs.length]) }
	if (self) { body.unshift(['THIS', self]) }
	body = ['DO', body]
    }

    // console.log(pargs)
    // console.log(body)

    return ['FUN', pargs, body]

}

var NULL_LABEL = normalizeLabel(null)

function normalize(sexp) {
    if (sexp instanceof Keyword) {
	return ['KEYWORD', sexp.name]
    }

    if (sexp instanceof Symbol.Simple) {
	return ['LOCAL', sexp.name]
    }     

    if (sexp instanceof Symbol.Qualified) {
	return ['GLOBAL', sexp.namespace, sexp.name]
    }

    if (sexp instanceof Symbol.Tagged) {
	throw Error('tagged symbol reached normalizer')
    }

    if (sexp instanceof Array) {
	return ['ARRAY', normalizeSeq(sexp)]
    }

    if (!(sexp instanceof List)) {
	return ['CONST', sexp]
    }

    // list

    sexp = sexp.toArray()

    if (maybeBuiltin(sexp[0])) {

	switch(sexp[0].name) {

	case '.':
	    var node = normalize(sexp[1])
	    for (var i=2; i<sexp.length; i++) {
		node = ['PROPERTY', node, normalize(sexp[i])]
	    }
	    return node

	case 'fn*': 
	    // console.log(sexp)
	    return normalizeFn(sexp[1].toArray(), sexp[2])

	case 'do' : 
	    return ['DO', normalizeSeq(sexp.slice(1))]

	case 'if' : 
	    return ['IF', 
		    normalize(sexp[1]), 
		    normalize(sexp[2]),
		    normalize(sexp[3])]

	case 'let*' :
	    return ['LET',
		    normalizeBindings(sexp[1]),
		    normalize(sexp[2])]

	case 'letrec*' :
	    return ['LETREC',
		    normalizeBindings(sexp[1]),
		    normalize(sexp[2])]

	case 'unwind-protect' :
	    return normalizeUnwindProtect(sexp)
	
	case 'set' :
	    return ['SET', normalize(sexp[1]), normalize(sexp[2])]

	case 'loop' : 
	    return ['LOOP', normalize(sexp[1])]

	case 'block' : 
	    return ['BLOCK', 
		    normalizeLabel(sexp[1]), 
		    normalize(sexp[2])]
	    
	case 'return-from':
	    return ['RETURN_FROM', 
		    normalizeLabel(sexp[1]), 
		    normalize(sexp[2])]

	case 'throw':
	    return ['THROW', normalize(sexp[1])]

	case 'js*':
	    return ['RAW', sexp[1]]

	case 'new':
	    return ['NEW', normalize(sexp[1]), normalizeSeq(sexp.slice(2))]

	}   
    }

    return ['CALL', normalize(sexp[0]), normalizeSeq(sexp.slice(1))]

}

// END reno.normalizer.js

// BEGIN reno.compiler.js

function tracerFor(node) {    
    function tracer(val) {
	tracer.traced = true
	return ['SET', node, val]
    }
    tracer.traced = false
    return tracer
}

function Scope(level, locals, labels) {
    this.level  = level
    this.locals = locals
    this.labels = labels
}

Scope.create = function() {
    return new Scope(0, 0, 0) 
}

Scope.prototype = {
    extend: function() {
	return new Scope(this.level+1, 0, 0)
    },

    makeLocal: function() {
	return ['LOCAL', this.level, this.locals++]
    },

    makeLabel: function(tracer) {
	return ['LABEL', this.level, this.labels++, false, tracer]
    }

}

function Context(block, env, scope) {
    this.block = block
    this.env   = env
    this.scope = scope
}

Context.create = function() {
    return new Context([], Dict.create(), Scope.create())
}

Context.compile = function(prog, wantRtn) {
    var ctx = Context.create()

    if (wantRtn) {
	var rtn = ctx.scope.makeLocal()
	ctx.compile(prog, tracerFor(rtn))
	ctx.declareLocals()
	ctx.push(['RETURN', rtn])
    } 

    else {
	ctx.compile(prog, null)
	ctx.declareLocals()
    }

    return ctx.block

}

Context.prototype = {

    extendEnv: function() {
	return new Context(
	    this.block, 
	    this.env.extend(), 
	    this.scope
	)
    },

    extendScope: function() {
	return new Context(
	    [],
	    this.env.extend(),
	    this.scope.extend()
	)
    },

    declareLocals: function() {
	if (this.scope.locals > 0) {
	    this.block.unshift(['DECLARE', this.scope.level, this.scope.locals]) 
	}
    },

    withBlock: function() {
	return new Context([], this.env, this.scope)
    },

    bindLabel: function(node, tracer) {
	var label = this.scope.makeLabel(tracer)
	this.env.put(node, label)
	return label
    },

    bindLocal: function(node) {
	var local = this.scope.makeLocal()
	this.env.put(node, local)
	return local
    },

    bindArgs: function(nodes) {
	var args = []
	for (var i=0; i<nodes.length; i++) {
	    var arg = ['ARG', this.scope.level, i]
	    this.env.put(nodes[i], arg)
	    args.push(arg)
	}
	return args
    },

    getLocal: function(node) {
	return this.env.get(node)
    },

    getLabel: function(node) {
	return this.env.get(node)
    },

    push: function(x) {
	this.block.push(x)
    },

    pushExpr: function(x, t) {
	this.block.push(t ? t(x) : x)
    },

    pushPure: function(x, t) {
	if (t) { this.block.push(t(x)) }
    },

    toAtom: function(node) {	
	var tag = node[0]
	switch(tag) {

	case 'CONST':
	    return node

	case 'VAR':
	    return this.getVar(node)

	default:
	    var atom = this.scope.makeLocal()
	    this.compile(node, tracerFor(atom))
	    return atom
	}
    },

    toExprs: function(nodes) {
	var exprs = []
	for (var i=0; i<nodes.length; i++) {
	    exprs[i] = this.toExpr(nodes[i])
	}
	return exprs
    },

    toExpr: function(node) {
	var tag = node[0]
	switch(tag) {

	case 'RESTARGS':
	case 'RAW':
	case 'CONST':
	case 'GLOBAL':	    
	    return node

	case 'ARRAY':
	    return ['ARRAY', this.toExprs(node[1])]

	case 'KEYWORD':
	    return ['CALL', 
		    ['GLOBAL', 'vegas', 'Keyword'], 
		    [['CONST', node[1]]]]

	case 'PROPERTY':
	    return ['PROPERTY', this.toExpr(node[1]), this.toExpr(node[2])]

	case 'LOCAL':
	    return this.getLocal(node)

	case 'SET':
	    var loc = this.toExpr(node[1])
	    this.compile(node[2], tracerFor(loc))
	    return loc

	case 'FUN':
	    var cmp    = this.extendScope()
	    var ret    = cmp.scope.makeLocal()
	    var args   = cmp.bindArgs(node[1])
	    cmp.compile(node[2], tracerFor(ret))
	    cmp.declareLocals()
	    cmp.push(['RETURN', ret])
	    return ['FUN', args, cmp.block]

	case 'CALL':
	    var callee = this.toExpr(node[1])
	    var args   = this.toExprs(node[2])
	    return ['CALL', callee, args]

	case 'NEW':
	    var callee = this.toExpr(node[1])
	    var args   = this.toExprs(node[2])
	    return ['NEW', callee, args]

	case 'THIS':
	case 'RESTARGS':
	case 'THROW':
	case 'RETURN_FROM':
	    this.compile(node, null)
	    return ['CONST', null]

	case 'DO':
	    var body = node[1]
	    var len  = body.length
	    for (var i=0; i<len; i++) {
		if (i < len-1) {
		    this.compile(body[i], null)
		} else {
		    return this.toExpr(body[i])
		}
	    }

	default:
	    var local = this.scope.makeLocal()
	    this.compile(node, tracerFor(local))
	    return local
	    
	}
    },

    toBlock: function(node, tracer) {
	var cmp = this.withBlock()
	cmp.compile(node, tracer)
	return cmp.block
    },

    compileBody: function(body, tracer) {	
	var len = body.length
	for (var i=0; i<len; i++) {
	    if (i < len-1) {
		this.compile(body[i], null)
	    } else {
		this.compile(body[i], tracer)
	    }
	}
    },

    compile: function(node, tracer) {
	var tag = node[0]

	switch(tag) {

	case 'RAW':
	case 'CONST':
	case 'GLOBAL':
	    this.pushPure(node, tracer)
	    break

	case 'KEYWORD':
	    this.pushPure(this.toExpr(node), tracer)
	    break

	case 'LOCAL':
	    this.pushPure(this.getLocal(node), tracer)
	    break

	case 'DO':
	    this.compileBody(node[1], tracer)
	    break

	case 'IF':
	    var test        = this.toAtom(node[1])
	    var consequent  = this.toBlock(node[2], tracer)
	    var alternative = this.toBlock(node[3], tracer)
	    this.push(['IF', test, consequent, alternative])
	    break

	case 'LOOP':
	    var cmp   = this.extendEnv()
	    var label = cmp.bindLabel(NULL_LABEL, tracer)
	    var block = cmp.toBlock(node[1], tracer)
	    this.push(['LOOP', label, block])	   
	    break

	case 'BLOCK':
	    var cmp   = this.extendEnv()
	    var label = cmp.bindLabel(node[1], tracer)
	    var block = cmp.toBlock(node[2], tracer)
	    this.push(['BLOCK', label, block])
	    break
	    
	case 'RETURN_FROM':
	    // label structure:
	    // [ TAG, LEVEL, ID, HAS_NON_LOCAL_EXITS?, TRACER, CONTEXT]
	    var label  = this.getLabel(node[1])
	    var tracer = label[4]
	    this.compile(node[2], tracer)
	    if (this.scope.level != label[1]) {	
		if (!label[3]) { label[3] = true }
		this.push(['NON_LOCAL_EXIT', label])
	    } else {
		this.push(['LOCAL_EXIT', label])
	    }
	    break

	case 'LETREC':
	    var ctx      = this.extendEnv()
	    var bindings = node[1]
	    var body     = node[2]
	    var locals = []

	    for (var i=0; i<bindings.length; i++) {		
		var pair  = bindings[i]
		var sym   = pair[0]
		var local = ctx.scope.makeLocal()
		locals.push(local)
		ctx.env.put(sym, local)
	    }

	    for (var i=0; i<bindings.length; i++) {		
		var pair  = bindings[i]
		var expr  = pair[1]
		var local = locals[i]
		ctx.compile(expr, tracerFor(local))
	    }

	    ctx.compile(body, tracer)

	    break

	case 'LET':
	    var ctx      = this
	    var bindings = node[1]
	    var body     = node[2]
	    for (var i=0; i<bindings.length; i++) {		
		var pair  = bindings[i]
		var sym   = pair[0]
		var expr  = pair[1]
		var local = ctx.scope.makeLocal()
		ctx.compile(expr, tracerFor(local))
		ctx = ctx.extendEnv()
		ctx.env.put(sym, local)
	    }
	    ctx.compile(body, tracer)
	    break

	case 'THROW':
	    this.push(['THROW', this.toExpr(node[1])])
	    break

	case 'PROPERTY':
	case 'SET':
	case 'FUN':
	case 'ARRAY':
	    this.pushPure(this.toExpr(node), tracer)
	    break

	case 'NEW':
	case 'CALL':
	    this.pushExpr(this.toExpr(node), tracer)
	    break

	case 'RESTARGS':
	    var local = this.bindLocal(node[1])
	    this.push(['RESTARGS', local, node[2]])
	    break

	case 'THIS':
	    var local = this.bindLocal(node[1])
	    this.push(['THIS', local])
	    break	    

	default:
	    throw Error('bad tag in compile: ' + node[0])
	}
    },

    compileTopLevelFragment: function(normalizedSexp) {
	this.compile(normalizedSexp)
	this.declareLocals()
	return this.block
    },

    compileExpression: function(normalizedSexp) {
	var ret = this.scope.makeLocal()
	this.compile(normalizedSexp, tracerFor(ret))
	this.declareLocals()
	this.push(['RETURN', ret])	
	return this.block
    }

}

// END reno.compiler.js

// BEGIN reno.emitter.js

function Emitter() {
    this.buffer    = []
    this.indention = 0
}

Emitter.emitProgram = function(program, options) {
    var e = new Emitter()
    if (options) { for (var v in options) { e[v] = options[v] } }
    e.emitStatements(program)
    return e.getResult()
}

Emitter.bake = function(program, options) {
    var e = new Emitter()
    if (options) { for (var v in options) { e[v] = options[v] } }
    e.emitStatements(program)
    var warhead = Function(e.globalSymbol, e.getResult())
    return warhead
}

Emitter.prototype = {
    indentSize:   4,

    globalSymbol: "RT",

    namespaceSeparator: "::",

    emitProgram: function(program) {
	this.emitStatements(program)
	return this.getResult()
    },

    getResult: function() {
	return this.buffer.join("")
    },

    indent: function() {
	this.indention += this.indentSize
    },

    dedent: function() {
	this.indention -= this.indentSize
    },

    write: function(x) {
	this.buffer.push(x)
    },

    tab: function() {
	var i=this.indention
	while(i--) { this.write(" ") }
    },

    // carriage return
    cr: function() {
	this.write("\n")
	this.tab()
    },

    emitNodes: function(nodes, sep) {
	var started = false
	for (var i=0; i<nodes.length; i++) {
	    if (started) { this.write(sep) } else { started = true }
	    this.emit(nodes[i])
	}
    },

    emitArray: function(nodes) {
	this.write("[")
	this.emitNodes(nodes, ", ")
	this.write("]")
    },

    emitList: function(nodes) {
	this.write("(")
	this.emitNodes(nodes, ", ")
	this.write(")")
    },

    emitStatements: function(nodes) {
	for (var i=0; i<nodes.length; i++) {
	    this.cr()
	    this.emit(nodes[i]);
	    this.write(";")
	}
    },

    emitBlock: function(nodes) {
	this.write("{")
	this.indent()
	this.emitStatements(nodes)
	this.dedent()
	this.cr()
	this.write("}")
    },

    emitLabel: function(node) {
	this.write("block_")
	this.write(node[1])
	this.write("_")
	this.write(node[2])
    },

    emitFlag: function(node) {
	this.write("flag_")
	this.write(node[1])
	this.write("_")
	this.write(node[2])
    },

    emitLabeledBlock: function(prefix, label, block) {
	var hasNonLocalExits = label[3]	

	if (hasNonLocalExits) {	    
	    this.write('var ')
	    this.emitFlag(label)
	    this.write(' = true;')
	    this.cr()
	    this.write('try {')
	    this.indent()
	    this.cr()
	}

	this.emitLabel(label)
	this.write(":")
	this.write(prefix)
	this.write(" ")
	this.emitBlock(block)
	
	if (hasNonLocalExits) {
	    this.dedent()
	    this.cr()

	    this.write("} catch (e) {")
	    this.indent()
	    this.cr()

	    this.write('if (')
	    this.emitFlag(label)
	    this.write(') {')
	    this.indent()
	    this.cr()

	    // flag not thrown
	    this.write('throw e;')
	    this.dedent()
	    this.cr()
	    this.write('}')
	    this.dedent()
	    this.cr()
	    this.write('} finally {')
	    this.indent()
	    this.cr()
	    
	    this.emitFlag(label)
	    this.write(' = false')
	    this.dedent()
	    this.cr()
	    this.write('}')	    
	}

    },

    emit: function(node) {
	var tag = node[0]
	var a   = node[1]
	var b   = node[2]
	var c   = node[3]

	switch(tag) {

	case 'IF':	    
	    this.write('if (')
	    this.emit(a)
	    this.write(' != null && ')
	    this.emit(a)
	    this.write(' !== false) ')
	    this.emitBlock(b)

	    if (c[0]) {
		this.write(' else ')
		if (c[0][0] == 'IF') {
		    this.emit(c[0])
		} 
		else {
		    this.emitBlock(c)
		}
	    }
	    break

	case 'ARRAY':
	    this.emitArray(a)
	    break

	case 'DECLARE':
	    this.write('var ')
	    var flag = false
	    for (var i=0; i<b; i++) {
		if (flag) { this.write(', ') } else { flag = true }
		this.write('local_' + a + '_' + i)
	    }
	    break

	case 'PROPERTY':
	    this.emit(a)
	    this.write('[')
	    this.emit(b)
	    this.write(']')
	    break

	case 'RAW':
	    this.write(a)
	    break

	case 'CONST':
	    if (typeof a == 'string') {
		this.write(JSON.stringify(a))
	    }

	    else {
		this.write('' + a)
	    }

	    break;

	case 'GLOBAL': 
	    this.write(this.globalSymbol)
	    this.write("[\"")
	    this.write(a)
	    this.write(this.namespaceSeparator)
	    this.write(b)
	    this.write("\"]")
	    break

	case 'ARG':
	    this.write("arg_" + a + "_" + b)
	    break

	case 'LOCAL':
	    this.write("local_" + a + "_" + b)
	    break

	case 'SET':
	    this.emit(a)
	    this.write(" = ")
	    this.emit(b)
	    break

	case 'FUN':
	    this.write("function")
	    this.emitList(a)
	    this.write(" ")
	    this.emitBlock(b)
	    break

	case 'CALL':
	    this.emit(a)
	    this.emitList(b)
	    break

	case 'THROW':
	    this.write('throw ')
	    this.emit(a)
	    break

	case 'RETURN':
	    this.write('return ')
	    this.emit(a)
	    break	    

	case 'LOOP':
	    this.emitLabeledBlock('for(;;)', a, b)
	    break

	case 'BLOCK':
	    this.emitLabeledBlock('', a, b)
	    break

	case 'LOCAL_EXIT':
	    this.write('break ')
	    this.emitLabel(a)
	    break

	case 'NON_LOCAL_EXIT':
	    this.emitFlag(a)
	    this.write(' = false; ')
	    this.write('throw "NON_LOCAL_EXIT"')
	    break

	case 'RESTARGS':
	    this.write('var len = arguments.length;')
	    this.cr()
	    
	    this.emit(a); this.write(' = new Array(len-'+b+');')	    
	    this.cr()

	    this.write('for(var i=0, ii=len-'+b+'; i<ii; i++) {')

	    this.indent()
	    this.cr()

	    this.emit(a)
	    this.write('[i] = arguments[i+'+b+'];')
	    
	    this.dedent()
	    this.cr()

	    this.write("}")
	    break

	case 'THIS':
	    this.emit(a)
	    this.write(' = this;')
	    break

	default:
	    throw Error('unhandled tag in emitter: ' + tag)

	}

    }

}


// END reno.emitter.js

// BEGIN reno.generic.js

// still not sure if we want to implement these in javascript or not
// but they make writing printers much easier

var $out = process.stdout

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

    List, function(xs, p, e) {
	p.write("(")
	_print_sequence(xs.toArray(), p, e)
	p.write(")")	
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



// END reno.runtime.js

// BEGIN reno.main.js

// initialization

var reno = Env.create('reno')

var specialForms = [
    'define*', 'define-macro*',
    'quote', 'quasiquote', 'unquote', 'unquote-splicing',
    'fn*', 'let*', 'letrec*', 'do', 'if', 'set',
    'block', 'loop', 'return-from', 'unwind-protect', 'throw', 'js*'
]

specialForms.forEach(function(name) {
    reno.putSymbol(new Symbol.Simple(name), name)
})

function p(x) {
    var inspect = require('util').inspect
    println(inspect(x, false, null))
}

function expandFile(file) {
    
    try {

	var fs  = require('fs')
	var src = fs.readFileSync(file, 'utf8')
	var rdr = Reader.create({input: src, origin: file})

	while (!rdr.isEmpty()) {	

	    var sexp  = rdr.readSexp() 
	    println('[READ]') 
	    prn(sexp) 
	    newline()

	    var esexp1 = expandSexp(reno, sexp) 
	    println('[EXPAND]')
	    prn(esexp1) 
	    newline()

	    var esexp2 = expandSexp(reno, esexp1)
	    println('[REEXPAND]')
	    prn(esexp2)
	    newline()

	    var nsexp = normalize(esexp2)
	    println('[NORMALIZE]')
	    p(nsexp)
	    newline()

	    var jsast = Context.compile(nsexp, true)
	    println('[COMPILE]')
	    p(jsast)
	    newline()

	    var js = Emitter.emitProgram(jsast)
	    println('[EMIT]')
	    println(js)
	    newline()
	    
	    var result = Function('RT', js)(RT)
	    println('[EVAL]')
	    prn(result)
	    newline()

	}

    }    

    catch(e) {

	println('[ERROR]')
	println(e.toString())

    }

}

exports.load = expandFile


// END reno.main.js