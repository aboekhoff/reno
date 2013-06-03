// initialization

var reno = Env.create('reno')

RT['reno::*env*'] = reno

RT['reno::macroexpand-1'] = function(sexp) {
    return macroexpand1(RT['reno::*env*'], sexp)
}

RT['reno::macroexpand'] = function(sexp) {
    return macroexpand(RT['reno::*env*'], sexp)
}

var specialForms = [
    'define*', 'define-macro*', 
    'quote', 'quasiquote', 'unquote', 'unquote-splicing',
    'fn*', 'let*', 'letrec*', 'do', 'if', 'set',
    'block', 'loop', 'return-from', 'unwind-protect', 'throw', 'js*',
    'require'
]

specialForms.forEach(function(name) {
    reno.putSymbol(new Symbol.Simple(name), name)
})

for (var v in RT) {
    var segs      = v.split("::")
    var namespace = segs[0]
    var name      = segs[1]
    var sym       = new Symbol.Simple(name)
    var qsym      = new Symbol.Qualified(namespace, name)
    Env.findOrCreate(namespace).putSymbol(sym, qsym)
}

function loadTopLevel(config) {
    var src    = config.src
    var env    = config.env
    var origin = config.origin

    var previousEnv = RT['reno::*env*']

    try {
	RT['reno::*env*'] = env
	expandTopLevel({
	    reader : Reader.create({input: src, origin: origin})
	})	
    }

    finally {
	RT['reno::*env*'] = previousEnv
    }

}

function expandTopLevel(config) {
    var rdr       = config.reader 
    var env       = config.env    || RT['reno::*env*']
    var buf       = config.buffer || []

    reading:while (!rdr.isEmpty()) {

	var sexp = rdr.read()
	buf.push(sexp)	
	
	expanding:while(buf.length > 0) {
	    var sexp = macroexpand(env, buf.shift())

	    publish('reno:macroexpand-toplevel-sexp', {sexp: sexp})

	    if (maybeResolveToDo(env, sexp)) {
		buf = sexp.rest().toArray().concat(buf)
		continue expanding
	    }

	    else if (maybeResolveToDefineMacro(env, sexp)) {

		var sym = sexp.rest().first()
		var def = sexp.rest().rest().first()			

		var esexp    = expand(env, def)

		var nsexp    = normalize(esexp)
		var jsast    = compile(nsexp, true)		
		var js       = emit(jsast)

		var warhead  = Function('RT', js)		
		var submacro = warhead(RT)

		var macro = (function(submacro) {		   
		    return function(sexp, callingEnv) {
			return submacro(sexp, callingEnv, env)
		    }		    
		})(submacro)

		var qsym = bindMacro(env, sym, macro)

		publish('reno:emit-toplevel-macro', {
		    symbol: qsym,
		    js:     js
		})

		continue expanding

	    }

	    else {

		if (maybeResolveToDefine(env, sexp)) {
		    var sym  = sexp.rest().first()
		    var loc  = bindGlobal(env, sym)		
		    var expr = sexp.rest().rest().first()
		    sexp = List.create(Symbol.builtin('set'), loc, expr)
		}	    
		
		var esexp   = expand(env, sexp)		
		var nsexp   = normalize(esexp)
		var jsast   = compile(nsexp, false)
		var js      = emit(jsast)

		publish('reno:emit-toplevel-expression', {
		    sexp: sexp,
		    js:   js
		})

		var warhead = Function('RT', js)	
		warhead(RT)
		continue expanding

	    }	    

	}

    }

}

function p(x) {
    var inspect = require('util').inspect
    println(inspect(x, false, null))
}

function compileFile(filename, main) {
    var src = require('fs').readFileSync(filename, 'utf8')
    var rdr = Reader.create({input: src, origin: filename})
    return compileReader(rdr, main)
}

function compileReader(reader, main) {    
    var ebuf = [reno_preamble]
    var mbuf = []

    function handleExpression(data) {
	ebuf.push(data.js)
    }

    function handleMacro(data) {
	mbuf.push(data)
	println('[HANDLE_DEFMACRO]')
	p(data)
	newline()
    }

    function handleSexp(data) {
	println('[MACROEXPAND]')
	prn(data.sexp)
	newline()
    }

    function handleCompile(ast) {
	println('[COMPILE]')
	p(ast)
	newline()
    }

    function handleNormalize(ast) {
	println(['NORMALIZE'])
	p(ast)
	newline()
    }

    function handleExpansion(esexp) {
	println(['EXPAND'])
	prn(esexp)
	newline()
    }

    // subscribe('reno:macroexpand-toplevel-sexp', handleSexp)
    subscribe('reno:emit-toplevel-expression', handleExpression)
    // subscribe('reno:emit-toplevel-macro', handleMacro)
    // subscribe('reno:compile', handleCompile)
    // subscribe('reno:normalize', handleNormalize)
    // subscribe('reno:expand', handleExpansion)
    // skip env creation for now

    expandTopLevel({
	reader : reader,
	env    : RT['reno::*env*']
    }) 

    // unsubscribe('reno:macroexpand-toplevel-sexp', handleSexp)
    unsubscribe('reno:emit-toplevel-expression', handleExpression)
    // unsubscribe('reno:emit-toplevel-macro', handleMacro)

    if (main) {
	ebuf.push('RT[' + JSON.stringify(main) + ']()')
    }

    return ebuf.join("\n")

}

// first things first
// we load reno

var reno_src = RT['reno::slurp']('reno.reno')
var reno_preamble = compileReader(
    Reader.create({input: reno_src, origin: 'reno.reno'})   
)

exports.compileFile = compileFile

console.log(process.argv)
