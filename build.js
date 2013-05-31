var fs   = require('fs')
var path = require('path')

SRC_DIR    = 'src'
OUTPUT_DIR = ''
COMPILER_TARGETS = [
    'reno.list.js', 
    'reno.symbol.js', 
    'reno.keyword.js',
    'reno.dict.js',
    'reno.env.js',
    'reno.reader.js',
    'reno.expander.js',
    'reno.normalizer.js',
    'reno.compiler.js',
    'reno.emitter.js',
    'reno.generic.js',
    'reno.pubsub.js',
    'reno.runtime.js',
    'reno.main.js'
]

BROWSER_RUNTIME_TARGETS = [
    'reno.list.js',
    'reno.symbol.js',
    'reno.keyword.js',
    'reno.generic.js',
    'reno.runtime.js'
]

// node reno

var buf = []

for (var i=0; i<COMPILER_TARGETS.length; i++) {
    var target = COMPILER_TARGETS[i]
    buf.push("// BEGIN " + target + "\n")
    buf.push(fs.readFileSync(path.join(SRC_DIR, target), 'utf8'))
    buf.push("// END " + target + "\n")
}

fs.writeFileSync('reno.js', buf.join("\n"))

// browser runtime

var buf = []

for (var i=0; i<BROWSER_RUNTIME_TARGETS.length; i++) {
    var target = BROWSER_RUNTIME_TARGETS[i]
    buf.push("// BEGIN " + target + "\n")
    buf.push(fs.readFileSync(path.join(SRC_DIR, target), 'utf8'))
    buf.push("// END " + target + "\n")
}

buf.unshift('!(function() {\n')
buf.push('window.RT = RT')
buf.push('\n})()')

fs.writeFileSync('reno.browser.js', buf.join("\n"))

