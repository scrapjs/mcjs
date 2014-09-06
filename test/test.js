var mdeps = require('module-deps');
var JSONStream = require('JSONStream');
var util = require('util');
var through = require('through2');
var map = require('map-stream');
var stream = require('stream');
var fs = require('fs');
var slug = require('slug');
var path = require('path');
var ttools = require('browserify-transform-tools')
var concat = require('concat-stream');
var debug = require('debug');
var estraverse = require('estraverse');
var esprima = require('esprima');
var escodegen = require('escodegen');
var escope = require('escope');
var browserify = require('browserify');
var unpack = require('browser-unpack');
var splicer = require('labeled-stream-splicer');



//global modules common variables aliases: 'var1: var1, var2: var2alias'
var globalVariables = {};

//module variable names keyed by module ids with aliases
var moduleVariableNames = {};


//process resulted modules deps once they’ve formed
var cc = concat(function(list){
	// console.log('concat:\n',util.inspect(list, {colors:true}));


	//declare all var module names beforehead
	//in order not to get accessed undeclared
	var declStr = '/* --------- Modules declaration ----------- */\n';
	declStr += 'var ';
	list.forEach(function(item){
		declStr += item.name + ', ';
	});
	declStr = declStr.slice(0, -2) + ';\n\n';
	// console.log(declStr);


	//concat sources in the proper order of declaration
	var result = declStr;
	list.forEach(function(dep){
		result += '\n\n/* --------- Module ' + dep.id + ' ----------- */\n';
		result += dep.source + '\n';
	});



	//replace require calls very stupidly, again, via RegEx
	var requireRe = /require\(['"]([^)]*)['"]\)?/g;
	// console.log(moduleVariableNames)
	result = result.replace(requireRe, function(requireStr, modName, idx, fullSrc){
		modName = require.resolve(modName);

		if (moduleVariableNames[modName]) {
			return moduleVariableNames[modName];
		}

		throw Error('Module to require not found: `' + modName + '`');
	});


	//stdout stream
	process.stdout.write(result);
});




//each module processor
var em = map(function(dep, done){
	// console.log('---------dep:\n',util.inspect(dep, {colors:true}));
	var src = dep.source;

	//get module var name
	var moduleVariableName = getModuleVarName(dep.id);

	//save module name to declare beforehead as a first-class var
	dep.name = moduleVariableName;
	moduleVariableNames[dep.id] = moduleVariableName;
	moduleVariableNames[dep.file] = moduleVariableName;
	// console.log('\n> Module', dep.id, ':', moduleVariableName, '\n');


	//replace `exports` & `module.exports` in code with `newName = xxx`
	//stupid regex replacers are the way faster and simpler than esprima for that goal
	src = src.replace(/module\.exports/g, moduleVariableName);
	src = src.replace(/module\[['"]\.exports['"]\]/g, moduleVariableName);
	src = src.replace(/exports/g, moduleVariableName);


	//analyze scopes - resolve variables interference
	var ast = esprima.parse(src);

	//optimistic flag causes getting references for variablse
	var moduleVars = escope.analyze(ast, {optimistic: true}).scopes[0].variables;

	moduleVars.forEach(function(item){
		// console.log('\nVariable:\n', item.name)

		if (globalVariables[item.name]) {
			//rename variable
			var newName = moduleVariableName + '_' + item.name
			// console.log('Rename var: ', item.name, ' → ', newName)

			//replace each occurence
			item.references.forEach(function(ref){
				ref.identifier.name = newName;
			});
		} else {
			//take place for var
			globalVariables[item.name] = item.name;
		}
	});


	//rebuild source
	dep.source = escodegen.generate(ast);
	// console.log(dep.source)

	done(null, dep);
});




//get module deps stream
var b = browserify(['./1.js'], {
	// fullPaths:false
});

// b.pipeline.get('emit-deps')
// .pipe(map(function(a, b){
// 	console.log(util.inspect(a, {colors: true}))
// 	b();
// }));
b.pipeline.get('emit-deps').pipe(em).pipe(cc);


b.bundle(function(e,r){});


/**
 * variable namer based on module id passed
 */
//extend slugifier charmap
slug.charmap['.'] = '$';
function getModuleVarName(name){
	//TODO: resolve absolute path ids

	name = slug(name).toLowerCase();

	//get rid of .js postfix
	if (name.slice(-3) === '.js') name = name.slice(0,-3);

	return 'm_' + name;
}