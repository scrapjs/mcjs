//TODO: build mocha (tests should pass)

//TODO: build assert

//TODO: build chai

const t = require('tap');
const mcjs = require('../plugin');
const browserify = require('browserify');



var b = browserify();
b.add(__dirname + '/1.js');
// b.add(__dirname + '/../../plotly.js/');
b.plugin(mcjs);

b.bundle(function (err, src) {
	if (err) console.error(err.message)//t.fail(err);
	// vm.runInNewContext(src, { console: { log: log } });
}, {list: true});
