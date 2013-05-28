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

