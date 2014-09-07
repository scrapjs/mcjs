#!/usr/bin/env node
var fs = require('fs');
var uc = require('../');
var browserify = require('browserify');
var path = require('path');

process.stdout.on('error', process.exit);


//get options
var opts = require('nomnom')
// .option('debug', {
// 	abbr: 'd',
// 	flag: true,
// 	help: 'Print debugging info'
// })
.option('basedir', {
	abbr: 'b',
	flag: false,
	help: 'Setup base dir to resolve modules'
})
.parse();


//get base dir to resolve modules
var basedir =  process.cwd() + '/' + opts.basedir;


//get stdin if no files passed
if (!opts._.length) {
	var b = browserify(process.stdin, {
		basedir: basedir
	});
}

else {
	//resolve files
	var files = opts._.map(function(filePath){
		return path.resolve(filePath);
	});


	//get module deps stream
	var b = browserify({
		entries: files,
		// fullPaths: true,
		// commondir: true
	});
}

//start pipeline
var bundle = uc(b);


b.on('error', errorExit);

bundle.on('error', errorExit);

function errorExit(err) {
	if (err.stack) {
		console.error(err.stack);
	}
	else {
		console.error(String(err));
	}
	process.exit(1);
}