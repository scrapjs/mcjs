/**
 * @module  mcjs
 *
 * Plugin for browserify providing alternate bundle
 */

const util = require('util');
const through = require('through2');
// const Transform = require('stream').Transform;
const replaceRequire = require('replace-requires');
const detective = require('detective');
const slug = require('slug');
const esprima = require('espree');
const escope = require('escope');
const gen = require('escodegen');
const path = require('path');


module.exports = function (b, opts) {

    //pack output returns array of strings, which is concatted - bundle result
    //same as `wrap` stage
    //we have to replace bundle output, therefore we act on pre-pack stage
    // b.pipeline.get('pack').push(transform);

    //pack input gets module with resolved deps/content
    //we have to form a single-module output, to save browserify packer
    let pipeline = b.pipeline.get('emit-deps');
    pipeline.push(t(replaceModuleExports));
    pipeline.push(t(replaceRequires));
    pipeline.push(t(prefixFirstLevelVars));

    //concat all processed deps to form single-chunk output
    let modules = [];
    let entry;
    let concat = through.obj((chunk, enc, next) => {
		modules.push(chunk);
		if (chunk.entry) entry = chunk;
		next();
	}, (flush) => {
		concat.push(mergeDeps(modules, entry));
		flush();
	});
    pipeline.push(concat);


	//create transform
	function t (fn) {
		// return Transform({
		// 	objectMode: true,
		// 	transform: function (chunk, enc, next) {
		// 		next(null, fn(chunk));
		// 	}
		// });
		return through.obj(function (chunk, enc, next) {
			next(null, fn(chunk));
		});
	}

	function replaceModuleExports (dep) {
		let moduleVarName = getModuleVarName(dep.id);

		//replace `module.exports`
		//regex replacers are faster and simpler than esprima for that goal
		//deep within parsing esprima does the same
		//so we just skip that step, sticking to spec
		//FIXME: there are cases of scopes, where function receives argument named `module` or `exports`, or a pattern like `let {module, exports} = obj`
		//it should work, but we have to test that
		//FIXME: there are cases where module/exports are disguised in some way, i.e. unable to eval statically, like out = module.exports; out.x = 123;
		dep.source = dep.source.replace(/\bmodule\.exports\s*=(?!=)/g, moduleVarName + '=');
		dep.source = dep.source.replace(/\bmodule\b\[\s*'exports'\s*\]\s*=(?!=)/g, moduleVarName + '=');
		dep.source = dep.source.replace(/\bmodule\b\[\s*"exports"\s*\]\s*=(?!=)/g, moduleVarName + '=');
		dep.source = dep.source.replace(/\bmodule\b\[\s*`exports`\s*\]\s*=(?!=)/g, moduleVarName + '=');
		dep.source = dep.source.replace(/\bexports\s*=(?!=)/g, moduleVarName + '=');

		//replace all `module` calls with an empty object
		//basically that is what browserify puts as `module`
		//FIXME: make this cover evaluated export expressions
		// dep.source = dep.source.replace(/\bmodule\b/g, '({})');

		return dep;
	}

	//resolve require calls - insert module paths instead of module names
	function replaceRequires (dep) {
		//node-detective way: outdated acorn shits the bed
		// try {
		// 	let {strings, expressions, nodes} = detective.find(dep.source, {
		// 		nodes: false,
		// 		parser: esprima
		// 	});
		// } catch (e) {
		// 	// console.log(dep);
		// 	throw e;
		// }
		// //FIXME: how to fix expression require calls? Throw an error?
		// if (expressions.length) {
		// 	throw Error(`Cannot require \`${expressions[0]}\` in ${dep.file}`);
		// }

		// let deps = {};

		// Object.keys(dep.deps).forEach(name => {
		// 	deps[name] = getModuleVarName(dep.deps[name]);
		// });

		// dep.source = replaceRequire(dep.source, deps);

		//regexp version
		dep.source = dep.source.replace(/require\(\s*['"`]([^'"`)]*)['"`]\s*\)/g, (requireStr, modPath, idx, fullSrc) => {
			return getModuleVarName(dep.deps[modPath]);
		});

		return dep
	}


	function prefixFirstLevelVars (dep) {
		//Resolve global modules variables conflict - analyze scopes
		let ast;

		try {
			ast = esprima.parse(dep.source);
		} catch (e) {
			throw e;
		}

		//optimistic flag causes getting references for variables (places where they’re met)
		let moduleVars = escope.analyze(ast, {optimistic: true}).scopes[0].variables;

		let moduleVarName = getModuleVarName(dep.id);

		//rename conflicting first-level vars
		//its first-level vars declared within a module, not the global-scope vars
		moduleVars.forEach(function(item){
			//rename variable
			let newName = moduleVarName + '_' + item.name;

			//replace each occurence
			item.references.forEach(function(ref){
				ref.identifier.name = newName;
			});

			//as well as definition
			item.identifiers.forEach(function(ident){
				ident.name = newName;
			});
		});

		//rebuild source
		//FIXME: include comments
		//FIXME: include source map optionally
		dep.source = gen.generate(ast);
		dep.source = '\nvar module = {exports: {}};\n' + dep.source;

		return dep;
	}

	//transform list of deps into one dep
	function mergeDeps (deps, entry) {
		//deps by ids
		let items = {};

		deps.forEach(dep => {
			items[dep.id] = dep;
		});


		//calc weights
		deps.forEach(calcWeight);

		//calc dep weight as a sum of dep weights + 1
		function calcWeight(item) {
			if (item.weight != null) return item.weight;
			item.weight = 1;
			let w = 1;
			for (let name in item.deps) {
				w += calcWeight(items[item.deps[name]]);
			}
			item.weight = w;
			return w;
		}

		//sort items by weights
		deps.sort(function(a, b){
			return a.weight > b.weight ? 1 : -1;
		});

		//declare all modules beforehead
		var str = '/** Merged modules */\n';
		let names = deps.map(dep => {
			return getModuleVarName(dep.id);
		});
		str += `var ${names.join(', ')};\n\n\n`;

		//provide sources
		let sources = deps.map(dep => {
			return `/** @module _m${dep.id} ${dep === entry ? '.' : path.relative(entry.file, dep.file)} */\n${dep.source}`;
		});
		str += sources.join('\n\n\n');

		//add resulting exports
		str += `\n\n\n/** Main exports */\nmodule.exports = ${getModuleVarName(entry.id)}\n`;

		entry.source = str;
		entry.deps = {};
		entry.indexDeps = {};
		entry.id = 1;
		entry.index = 1;

		return entry;
	}

	//get variable name for a module
	function getModuleVarName (id) {
		return '_m' + id// + '_' + slug(name).toLowerCase();
	}
};

