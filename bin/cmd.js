#!/usr/bin/env node
var fs = require('fs');
var uc = require('../');
var path = require('path');

process.stdout.on('error', process.exit);


//get options
//TODO: extend options
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


var bundle;

//get stdin if no files passed
if (!opts._.length) {
	bundle = uc(process.stdin, {
		basedir: basedir
	});
}

else {
	//resolve files
	var files = opts._.map(function(filePath){
		return path.resolve(filePath);
	});

	bundle = uc(files);
}

//stdout on success
bundle.on('success', function(result){
	process.stdout.write(result);
});

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