require('./build.js')

var fs      = require('fs')
var reno    = require('./reno.js')
var scratch = reno.compileFile('./scratch.reno', 'reno::-main')

fs.writeFileSync('scratch.js', scratch)
