var Transform = require('stream').Transform;
var inherits = require('inherits');
var falafel = require('falafel');

inherits(Uncommon, Transform);
module.exports = Uncommon;


function Uncommon (mapF, opts) {
	if (!(this instanceof Uncommon)) return new Uncommon(mapF, opts);
	Transform.call(this, { objectMode: true });
	if (!opts) opts = {};

	//map name to integer
	this._mapF = mapF || function () {
		var n = 0;
		return function (key) { return ++ n };
	};

	this._name = opts.name || 'require';
}

Uncommon.prototype._transform = function (row, enc, next) {
	var self = this;
	var keys = Object.keys(row.deps);
	if (keys.length === 0) {
		this.push(row);
		return next();
	}

	var mapF = this._mapF();
	var deps = row.deps;
	var mapped = {};
	row.deps = keys.reduce(function (acc, key) {
		var x = mapF(key);
		mapped[key] = x;
		acc[x] = deps[key];
		return acc;
	}, {});

	row.source = falafel(row.source, function (node) {
		if (self._isRequire(node)) {
			var key = node.arguments[0].value;
			node.arguments[0].update(JSON.stringify(mapped[key]));
		}
	}).toString();

	this.push(row);
	next();
};

Uncommon.prototype._flush = function (next) {
	this.push(null);
	next();
};

Uncommon.prototype._isRequire = function (node) {
	var c = node.callee;
	return c && node.type === 'CallExpression'
		&& c.type === 'Identifier'
		&& c.name === this._name
	;
}