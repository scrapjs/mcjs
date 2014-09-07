module['exports'] = {
	a: 1,
	b: c
};

var sdf = 45;

function c(){
	f = 123;
	sdf = 123;
}

sdf = 46;

module.exports.z = c;

module['exports']['f'] = sdf;

var n = require('node-noop');