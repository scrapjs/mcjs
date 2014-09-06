/**
 * try to retrieve module name from the path
 *
 * @param {[type]} script [description]
 *
 * @return {[type]} [description]
 */

function getModuleName(srcPath){
	var path = resolvePath(srcPath);
	var moduleName;

	//catch dirname after last node_modules dirname, if any
	var idx = path.lastIndexOf('node_modules');
	if (idx >= 0){
		path = path.slice(idx);
		var matchResult = /node_modules[\/\\](.+)/.exec(path);
		moduleName = matchResult[1];
	}

	//else take file name as the module name
	if (!moduleName) {
		moduleName = path.split(/[\\\/]/).pop().split('.').shift();
	}

	return moduleName.toLowerCase();
}


/**
 * return absolute path
 *
 * @todo  Use node version
 */

function resolvePath(path){
	var a = document.createElement('a');
	a.href = path;
	return a.href;
}


/**
 * Get variable name for module
 *
 * @return {string} New module var name
 */

function getModuleVariableName(module ){

}

