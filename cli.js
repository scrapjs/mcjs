#!/usr/bin/env node
var fs = require('fs');
var uc = require('./');
var path = require('path');

process.stdout.on('error', process.exit);


//get options
var opts = require('nomnom')
// .option('comments', {
// 	abbr: 'c',
// 	help: 'Keep modules comments in export.',
// 	flag: true,
// 	default: false
// })
// .option('debug', {
// 	abbr: 'd',
// 	flag: true,
// 	help: 'Provide source maps in output.'
// })
.option('basedir', {
	abbr: 'b',
	flag: false,
	metavar: 'PATH',
	help: 'Setup relative base dir to resolve modules.'
})
.option('version', {
	abbr: 'v',
	help: 'Show version of uncommon.',
	flag: true,
	callback: function(){
		var pkg = require('../package.json');
		console.log(pkg.name + ' ' + pkg.version);
		return process.exit(1);
	}
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

	bundle = uc(files, opts);
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