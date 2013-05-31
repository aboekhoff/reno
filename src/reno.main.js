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

	    if (maybeResolveToDo(sexp)) {
		buf = sexp.rest().toArray().concat(buf)
		continue expanding
	    }

	    if (maybeResolveToDefineMacro(sexp)) {

		var sym      = sexp.rest().first()
		var sexp     = sexp.rest().rest().first()
		var esexp    = expand(env, sexp)
		var nsexp    = normalize(sexp)
		var jsast    = compile(nsexp, true)		
		var js       = emit(jsast)


		var warhead  = Function('RT', js)		
		var submacro = warhead(RT)
		var macro    = function(sexp, callingEnv) {
		    return submacro(sexp, callingEnv, env)
		}

		var qsym = bindMacro(env, sym, macro)

		publish('reno:emit-toplevel-macro', {
		    symbol: qsym,
		    js:     js
		})

		continue expanding
	    }

	    else {

		if (maybeResolveToDefine(sexp)) {
		    var sym  = sexp.rest().first()
		    var expr = sexp.rest().rest().first()
		    var loc  = bindGlobal(env, sym)		
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
    var ebuf = []
    var mbuf = []

    function handleExpression(data) {
	ebuf.push(data.js)
	println('[HANDLE_EXPRESSION]')
	println(data.js)
	newline()
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

    subscribe('reno:macroexpand-toplevel-sexp', handleSexp)
    subscribe('reno:emit-toplevel-expression', handleExpression)
    subscribe('reno:emit-toplevel-macro', handleMacro)

    // skip env creation for now

    expandTopLevel({
	reader : reader,
	env    : reno	
    }) 

    unsubscribe('reno:macroexpand-toplevel-sexp', handleSexp)
    unsubscribe('reno:emit-toplevel-expression', handleExpression)
    unsubscribe('reno:emit-toplevel-macro', handleMacro)

    if (main) {
	ebuf.push('RT[' + JSON.stringify(main) + ']()')
    }

    return ebuf.join("\n")

}

exports.compileFile = compileFile
