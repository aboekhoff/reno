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