exports = {
	a: 1,
	b: require('./2.js')
};

var c = 3;

exports['z'] = 4;

var path = './2.js';
// var x = require(path);

