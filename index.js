//TODO: get rid of browserify dep? Collect requirements statically

//TODO Standalone compilation with no module checking: window.Name = module (use case - weakset)
//TODO tests (browser-table)
//TODO pass module prefix
//TODO debug mode
//TODO cut comments
//TODO wrapper (umd/closure) + name (keep window minified, name untouched)
//TODO exclude files
//TODO externs - list of global reserved words
//TODO humanized output
//TODO same options as browserify, especially -r

//FIXME provide require function at the top for runtime calculations


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


/**
 * @module uncommonjs
 * @param {Browserify} b Browserify instance
 */
var uc = module.exports = function(b){
	b.pipeline
	.get('dedupe')

	//prepare each module
	.pipe(
		map(
			function(dep, done){
				processModule(dep);
				done(null, dep);
			})
		)

	//form result
	.pipe(
		concat(
			function(list){
				var result = processResult(list);

				//stdout result code
				process.stdout.write(result);
			}
		)
	);

	var bundle = b.bundle(function(e,r){});

	return bundle;
};


/** Prefix for module global vars */
var prefix = 'm_';


/** global variables aliases dict: 'var1: var1, var2: var2alias' */
var globalVariables = {};

/** module variable names and aliases keyed by module ids */
var moduleVariableNames = {};

/** cache of module paths keyed by ids */
var modulePath = {};


/** catch `require` in code (too bad, I know, but the fastest relative to esprima) */
var requireRe = /require\(['"]?([^'")]*)['"]?\)/g;



/**
 * Process resulted module dep list once it’s formed
 *
 * @param {array} list A list of module deps
 *
 * @return {[type]} [description]
 */
function processResult(list){
	//sort deps to include innermost first

	//dupes aliases
	var dupes={};

	//filter list of deps
	list = list

	//remove duplicates
	.filter(function(item){
		if (item.dedupe) {
			dupes[item.id] = item.dedupeIndex;
			return false;
		}
		return true;
	})

	//sort deps to declare in proper order
	.sort(function(a,b){
		//if includes one as an other’s dep - declare independent first
		if (hasDep(a, b)) return 1;
		if (hasDep(b, a)) return -1;

		//calc number of deps, return smaller
		//suppose that less-dependent module is better to be declared first
		if (depNumber(a) > depNumber(b)) return 1;
		else return -1;
	});

	//whether a-dep depends on b
	function hasDep(a, b){
		for (var name in a.deps){
			if (a.deps[name] === b.id || dupes[a.deps[name]] === b.id) return true;
		}
		return false;
	}

	function depNumber(a){
		return Object.keys(a.deps).length;
	}


	// list.forEach(function(item){
	// 	item.source = item.source.slice(0,30) + '... ' + item.source.length;
	// });
	// console.log(dupes)
	// console.log('concat:\n',util.inspect(list, {colors:true}));


	//declare all var module names beforehead
	//in order to not get accessed undeclared
	var declStr = '/* -------- Modules declarations -------- */\n';
	declStr += 'var ';
	list.forEach(function(item){
		declStr += item.name + ', ';
	});
	declStr = declStr.slice(0, -2) + ';\n\n';


	//concat sources in the proper order of declaration
	var result = declStr;
	list.forEach(function(dep){
		result += '\n\n/* ---------- Module ' + moduleVariableNames[dep.id] + ' ---------- */\n';
		result += dep.source + '\n';
	});


	//replace require calls
	result = result.replace(requireRe, function(requireStr, modPath, idx, fullSrc){
		var modName;

		//get module name from cached paths
		if (modulePath[modPath]) modName = modulePath[modPath];

		//resolve unresolved module
		else modName = resolve.sync(modPath);

		//replace require with var name
		if (moduleVariableNames[modName]) {
			return moduleVariableNames[modName];
		}

		throw Error('Module to require isn’t found: `' + modName + '`');
	});

	return result;
}



/**
 * Process a separate module
 *
 * @param {object} dep A dependency object (module info)
 *
 * @return {object} The dep with rebuilt `source` property
 */
function processModule(dep){
	// console.log('---------dep:\n',util.inspect(dep, {colors:true}));
	var dir = path.dirname(dep.file);
	var src = dep.source;

	//get module var name
	var moduleVariableName = getModuleVarName(dep);

	//save module name to declare it beforehead as a first-class var
	dep.name = moduleVariableName;
	moduleVariableNames[dep.id] = moduleVariableName;
	moduleVariableNames[dep.file] = moduleVariableName;
	modulePath[dep.id] = dep.file;
	// console.log('\n> Module', dep.id, ':', moduleVariableName);


	//replace `exports` & `module.exports` in code with `newName`
	//stupid regex replacers are the way faster and simpler than esprima for that goal
	src = src.replace(/\bmodule\.exports/g, moduleVariableName);
	src = src.replace(/\bmodule\b\[\s*['"]exports['"]\s*\]/g, moduleVariableName);
	src = src.replace(/\bexports\b/g, moduleVariableName);

	//replace all `module` calls with an empty object
	//FIXME: ensure this is right
	src = src.replace(/\bmodule\b/g, '{}');


	//resolve require calls (insert module paths instead of module names)
	//FIXME: what about runtime/calculated require calls?
	src = src.replace(requireRe, function(requireStr, moduleName, idx, fullSrc){
		try {
			moduleName = resolve.sync(moduleName, {
				basedir: dir
			});
		} catch (e) {

		}

		return 'require(\'' + moduleName.replace(/\\/g, '/') + '\')';
	});
	// console.log(src)


	//Resolve global modules variables conflict - analyze scopes
	var ast = esprima.parse(src);

	//optimistic flag causes getting references for variables (places where they’re met)
	var moduleVars = escope.analyze(ast, {optimistic: true}).scopes[0].variables;

	//rename conflicting first-level vars
	//its first-level vars declared within a module, not the global-scope vars
	moduleVars.forEach(function(item){
		// console.log('Variable:', item.name)

		if (globalVariables[item.name]) {
			//rename variable
			var newName = moduleVariableName + '_' + item.name;

			//replace each occurence
			item.references.forEach(function(ref){
				ref.identifier.name = newName;
			});

			//as well as a definition
			item.identifiers.forEach(function(ident){
				ident.name = newName;
			});
		} else {
			//reserve var name
			globalVariables[item.name] = item.name;
		}
	});


	//rebuild source
	//FIXME: include comments
	//FIXME: include source map optionally
	dep.source = escodegen.generate(ast);

	return dep;
}



//extend slugifier charmap (replace . and - in paths with $ and _ in code)
slug.charmap['.'] = '$';
slug.charmap['-'] = '_';


/**
 * Name variable based on module id
 */
//TODO: fuck all this stuff. Get rid of fucking name resolving via path. Use natural module names which should be available in deps resolver.
function getModuleVarName(dep){
	var name, modulePath;

	//catch dirname after the last node_modules dirname, if any
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

	return prefix + name;
}