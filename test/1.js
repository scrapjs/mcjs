exports = {
	a: 1,
	b: require('./2.js')
};

var c = 3;

exports['z'] = 4;

var d = require(2)