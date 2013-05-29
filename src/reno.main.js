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

	    var pos = rdr.getPosition()

	    function printHeader(txt) {
		println('[' + txt + '] ' + pos)  
	    }

	    printHeader('READ')
	    var sexp  = rdr.readSexp() 
	    prn(sexp) 
	    newline()

	    printHeader('EXPAND')
	    var esexp1 = expandSexp(reno, sexp) 
	    prn(esexp1) 
	    newline()

	    /*
	    printHeader('REEXPAND')
	    var esexp2 = expandSexp(reno, esexp1)
	    prn(esexp2)
	    newline()
	    */

	    printHeader('NORMALIZE')
	    var nsexp = normalize(esexp1)
	    p(nsexp)
	    newline()

	    printHeader('COMPILE')
	    var jsast = Context.compile(nsexp, true)
	    p(jsast)
	    newline()

	    printHeader('EMIT')
	    var js = Emitter.emitProgram(jsast)
	    println(js)
	    newline()
	    
	    printHeader('EVAL')
	    var result = Function('RT', js)(RT)
	    prn(result)
	    newline()

	}

    }    

    catch(e) {

	printHeader('ERROR')
	throw(e)

    }

}

// slightly tricky spot
// for evaluation, 

function compileFile(file, main) {

    var buf = []
    
    try {

	var fs  = require('fs')
	var src = fs.readFileSync(file, 'utf8')
	var rdr = Reader.create({input: src, origin: file})

	while (!rdr.isEmpty()) {	

	    var pos = rdr.getPosition()

	    function printHeader(txt) {
		println('[' + txt + '] ' + pos)  
	    }

	    printHeader('READ')
	    var sexp  = rdr.readSexp() 
	    prn(sexp) 
	    newline()

	    printHeader('EXPAND')
	    var esexp1 = expandSexp(reno, sexp) 
	    prn(esexp1) 
	    newline()

	    /*
	    printHeader('REEXPAND')
	    var esexp2 = expandSexp(reno, esexp1)
	    prn(esexp2)
	    newline()
	    */

	    printHeader('NORMALIZE')
	    var nsexp = normalize(esexp1)
	    p(nsexp)
	    newline()

	    // emit for toplevel eval

	    printHeader('COMPILE')
	    var jsast = Context.compile(nsexp, true)
	    p(jsast)
	    newline()

	    printHeader('EMIT')
	    var js = Emitter.emitProgram(jsast)
	    println(js)
	    newline()
	    
	    printHeader('EVAL')
	    var result = Function('RT', js)(RT)
	    prn(result)
	    newline()

	    // printHeader('AOT_COMPILE')
	    var jsast = Context.compile(nsexp, false)

	    // printHeader('AOT_EMIT')
	    var js = Emitter.emitProgram(jsast)
	    
	    buf.push(js)	    

	}

    }    

    catch(e) {

	printHeader('ERROR')
	println('aborting compilation')
	throw(e)

    }

    if (main) {
	buf.push('RT[' + JSON.stringify(main) + ']()')
    }

    return buf.join("\n")    

}

exports.expandFile = expandFile
exports.compileFile = compileFile
