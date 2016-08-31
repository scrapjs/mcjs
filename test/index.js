//TODO: build mocha (tests should pass)

//TODO: build assert

//TODO: build chai

const t = require('tap');
const mcjs = require('../plugin');
const browserify = require('browserify');
const vm = require('vm');
const collapse = require('bundle-collapser/plugin');



var b = browserify();
// b.add(__dirname + '/1.js');
b.add(__dirname + '/../../plotly.js/');
// b.add(__dirname + '/../node_modules/bn.js');
b.plugin(collapse);

//516979 vs 494885

b.bundle(function (err, src) {
	if (err) console.error(err.message)//t.fail(err);
	console.log(src.toString('utf-8'))
	// vm.runInNewContext(src, { console: { log: console.log } });
}, {list: true});
