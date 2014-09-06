/**
 * @module uncommon
 *
 * @todo  tests
 */



var util = require('util');
var map = require('map-stream');
var fs = require('fs');
var slug = require('slug');
var path = require('path');
var concat = require('concat-stream');
var estraverse = require('estraverse');
var esprima = require('esprima');
var escodegen = require('escodegen');
var escope = require('escope');
var browserify = require('browserify');
var splicer = require('labeled-stream-splicer');


//get options
var opts = require("nomnom")
.option('debug', {
	abbr: 'd',
	flag: true,
	help: 'Print debugging info'
})
.option('module_prefix', {
	abbr: 'p',
	flag: false,
	help: 'Prefix to add to module variables'
})
.parse();



//global modules common variables aliases: 'var1: var1, var2: var2alias'
var globalVariables = {};

//module variable names keyed by module ids with aliases
var moduleVariableNames = {};

//catch require in code (too bad, i know, but the most fast relative to esprima)
var requireRe = /require\(['"]([^)]*)['"]\)?/g;


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
	result = result.replace(requireRe, function(requireStr, modName, idx, fullSrc){
		modName = require.resolve(modName);

		if (moduleVariableNames[modName]) {
			return moduleVariableNames[modName];
		}

		throw Error('Module to require isn’t found: `' + modName + '`');
	});


	//stdout stream
	process.stdout.write(result);
});




//each module processor
var em = map(function(dep, done){
	// console.log('---------dep:\n',util.inspect(dep, {colors:true}));
	var dir = path.dirname(dep.file);
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


	//resolve require calls
	src = src.replace(requireRe, function(requireStr, modName, idx, fullSrc){
		modName = require.resolve(dir + '\\' + modName);

		return 'require(\'' + modName.replace(/\\/g, '/') + '\')';
	});
	// console.log(src)


	//analyze scopes - resolve variables interference
	var ast = esprima.parse(src);

	//optimistic flag causes getting references for variablse
	var moduleVars = escope.analyze(ast, {optimistic: true}).scopes[0].variables;

	moduleVars.forEach(function(item){
		console.log('\nVariable:', item.name)

		if (globalVariables[item.name]) {
			//rename variable
			var newName = moduleVariableName + '_' + item.name
			console.log('Rename var: ', item.name, ' → ', newName)

			//replace each occurence
			item.references.forEach(function(ref){
				ref.identifier.name = newName;
			});
			//as well as definition
			item.identifiers.forEach(function(ident){
				ident.name = newName;
			})
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




//resolve files
var files = opts._.map(function(filePath){
	return path.resolve(filePath);
});


//get module deps stream
var b = browserify(files, {
	// fullPaths:false
});

b.pipeline.get('emit-deps')
// .pipe(map(function(a, b){
// 	console.log(123, util.inspect(a, {colors: true}))
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

	return opts.module_prefix || 'm_' + name;
}