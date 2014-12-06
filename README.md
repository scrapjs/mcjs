# Uncommon-js [![deps](https://david-dm.org/dfcreative/color-ranger.svg)](https://david-dm.org/dfcreative/color-ranger) <a href="http://unlicense.org/UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>

Merge node modules into a single file, replace all requires with global variables. It gains maximum compression in browserifying modules.


## Some stats

Comparison of minified & gzipped results with simple/advanced compression.

| Package | Browserify/Uncommon simple | Browserify/Uncommon advanced |
|----|----|----|----|
| [color-space](https://github.com/dfcreative/color-space) | _5.21kb / 4.8kb_ (7.8%) | _5kb / 4.4kb_ (12%) |
| [emmy](https://github.com/dfcreative/color-space) | _4.18kb / 2.78kb_ (33.3%) | _4.02kb / 2.71kb_ (32.6%) |
| [mod](https://github.com/dfcreative/mod) | _16.5kb_ | [_13kb_](https://github.com/dfcreative/mod/blob/master/dist/mod.js) | **~27%** |


## Use

`$ npm install -g uncommonjs` or `$ npm install uncommonjs`

a.js:

```js
var z = 123;
module.exports = {
	x: 1,
	y: z
};
```

index.js:
```js
var a = require('a');
var z = 456;

exports = z;
```

Run uncommon:

`$ uncommon index.js > bundle.js`


Resulting bundle.js:

```js
var m_a, m_index;

var z = 123;
m_a = {
	x:1,
	y:z
};

var a = m_a;
var m_index_z = 456;

m_index = m_index_z;
```


## API

Pass an entry file, and uncommon will output result with all dependencies included.

`$ uncommon index.js > bundle.js` or `$ cat index.js | uncommon > bundle.js`


You can wrap the result as `uncommon --wrap='before %output% after'`, to apply your own wrapper, like `uncommon -w='window.Plugin=Plugin;%output%'`.


It’s best as a pre-closurecompiler task:

```
"build": "uncommon index.js > dist/bundle.js"
"min": "ccjs --compilation_level=ADVANCED_OPTIMIZATIONS dist/bundle.js > dist/bundle.min.js"
```


## Options

[TODO: wrap, ...]


## Motivation

As far closure compiler may quite easily expand any objects, if to merge modules into a single scope, which means to resolve global vars conflict and replace all `module.exports` and `require` calls, then you get one-scoped bundle, which closure compiler compresses the way better than separated by scopes browserified bundle. Besides, uncommon cuts out duplicated dependencies, unlike the browserify.

Uncommon-js does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but it avoids creating of `goog.provide`'s and makes variables more human-readable.


[![NPM](https://nodei.co/npm/uncommonjs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/uncommonjs/)