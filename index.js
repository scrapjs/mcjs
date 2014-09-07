/**
 * @module uncommon
 *
 * @todo  tests
 * @todo Options: prefix, debug, comments, stub
 */

var util = require('util');
var map = require('map-stream');
var fs = require('fs');
var slug = require('slug');
var path = require('path');
var concat = require('concat-stream');
var esprima = require('esprima');
var escodegen = require('escodegen');
var escope = require('escope');
var resolve = require('resolve');
var umd = require('umd');


/**
 * @module uncommonjs
 * @param {Browserify} b Browserify instance
 */

var uc = module.exports = function(b){
	b.pipeline.get('sort')
	.pipe(handleEach)
	.pipe(handleAll);

	// umd(result, false, result);

	var bundle = b.bundle(function(e,r){});

	return bundle;
};

var prefix = 'm_';


//global modules common variables aliases: 'var1: var1, var2: var2alias'
var globalVariables = {};

//module variable names keyed by module ids with aliases
var moduleVariableNames = {};

//catch require in code (too bad, i know, but the most fast relative to esprima)
var requireRe = /require\(['"]([^)]*)['"]\)?/g;


//process resulted modules deps once they’ve formed
handleAll = concat(function(list){

	//sort deps to include innermost first
	list = list.sort(function(a,b){
		if (hasDep(a, b)) return 1;
		else return -1;
	});

	//whether a-dep depends on b
	function hasDep(a, b){
		for (name in a.deps){
			if (a.deps[name] === b.id) return true;
		}
		return false;
	}
	// console.log('concat:\n',util.inspect(list, {colors:true}));

	//declare all var module names beforehead
	//in order not to get accessed undeclared
	var declStr = '/* --------- Modules declarations ----------- */\n';
	declStr += 'var ';
	list.forEach(function(item){
		declStr += item.name + '={}, ';
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
		modName = resolve.sync(modName);

		if (moduleVariableNames[modName]) {
			return moduleVariableNames[modName];
		}

		throw Error('Module to require isn’t found: `' + modName + '`');
	});

	//stdout stream
	process.stdout.write(result);
});


//each module processor
handleEach = map(function(dep, done){
	// console.log('---------dep:\n',util.inspect(dep, {colors:true}));
	var dir = path.dirname(dep.file);
	var src = dep.source;

	//get module var name
	var moduleVariableName = getModuleVarName(dep);

	//save module name to declare beforehead as a first-class var
	dep.name = moduleVariableName;
	moduleVariableNames[dep.id] = moduleVariableName;
	moduleVariableNames[dep.file] = moduleVariableName;
	// console.log('\n> Module', dep.id, ':', moduleVariableName, '\n');


	//replace `exports` & `module.exports` in code with `newName = xxx`
	//stupid regex replacers are the way faster and simpler than esprima for that goal
	src = src.replace(/\bmodule\.exports/g, moduleVariableName);
	src = src.replace(/\bmodule\b\[['"]\.exports['"]\]/g, moduleVariableName);
	src = src.replace(/\bexports\b/g, moduleVariableName);

	//replace all `module` calls with an empty object
	src = src.replace(/\bmodule\b/g, '{}');

	//resolve require calls
	src = src.replace(requireRe, function(requireStr, modName, idx, fullSrc){
		modName = resolve.sync(modName, {
			basedir: dir
		});

		return 'require(\'' + modName.replace(/\\/g, '/') + '\')';
	});
	// console.log(src)


	//analyze scopes - resolve variables interference
	var ast = esprima.parse(src);

	//optimistic flag causes getting references for variablse
	var moduleVars = escope.analyze(ast, {optimistic: true}).scopes[0].variables;

	moduleVars.forEach(function(item){
		// console.log('\nVariable:', item.name)

		if (globalVariables[item.name]) {
			//rename variable
			var newName = moduleVariableName + '_' + item.name
			// console.log('Rename var: ', item.name, ' → ', newName)

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



/**
 * variable namer based on module id passed
 */
//extend slugifier charmap
slug.charmap['.'] = '$';
slug.charmap['-'] = '_';
function getModuleVarName(dep){
	var name, modulePath;

	//catch dirname after last node_modules dirname, if any
	var idx = dep.file.lastIndexOf('node_modules');
	if (idx >= 0){
		var path = dep.file.slice(idx);
		var matchResult = /node_modules[\/\\](.+)/.exec(path);
		modulePath = matchResult[1];

	}

	else if (dep.entry) {
		var matchResult = /([^\/\\]+)[\/\\][^\/\\]+$/.exec(dep.file);
		modulePath = matchResult[1];
	}

	//try to take dirname before index.js, if dep is an entry
	if (modulePath)	{
		//shorten index.js
		if (/[\\\/]index.js$/.test(modulePath)) name = modulePath.slice(0, -9);
		else name = modulePath;
	}

	//else take id as a name
	if (!name) name = dep.id;

	name = slug(name).toLowerCase();

	//get rid of .js postfix
	if (name.slice(-3) === '.js') name = name.slice(0,-3);

	return !/^[a-zA-Z_$]/.test(name) ? prefix + name : name;
}