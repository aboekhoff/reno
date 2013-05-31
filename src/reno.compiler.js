function compile(normalizedSexp, wantReturn) {
    var ast = Context.compile(normalizedSexp, wantReturn)
    publish('reno:compile', ast)
    return ast
}

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
