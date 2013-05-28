var fs   = require('fs')
var path = require('path')

SRC_DIR    = 'src'
OUTPUT_DIR = ''
TARGETS    = [
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
    'reno.runtime.js',
    'reno.main.js'
]

var buf = []

for (var i=0; i<TARGETS.length; i++) {
    var target = TARGETS[i]
    buf.push("// BEGIN " + target + "\n")
    buf.push(fs.readFileSync(path.join(SRC_DIR, target), 'utf8'))
    buf.push("// END " + target + "\n")
}

fs.writeFileSync('reno.js', buf.join("\n"))
