# MCJS [![Build Status](https://travis-ci.org/dfcreative/mcjs.svg?branch=master)](https://travis-ci.org/dfcreative/mcjs) [![Code Climate](https://codeclimate.com/github/dfcreative/mcjs/badges/gpa.svg)](https://codeclimate.com/github/dfcreative/mcjs) [![deps](https://david-dm.org/dfcreative/mcjs.svg)](https://david-dm.org/dfcreative/mcjs) <a href="UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>

**M**erge **C**ommon **JS** modules into a single module.

_MCJS_ produces a single module with all inner requirements merged into a single scope and names conflicts resolved. That way is avoided any code overhead and gained maximum compressability.


## Some stats

Compare minified sources (via closure compiler):

| Package | Browserify | MCJS |
|---|---|---|---|---|
| [color-space](https://github.com/dfcreative/color-space) | 5kb | 4.4kb | 12% |


# Usage

##### 1. Install

`$ npm install -g mcjs`


##### 2. Build

Files:

_dep.js_:

```js
var z = 123;
module.exports = z;
```

_index.js_:
```js
var a = require('./dep');
module.exports = a;
```

Pass _index.js_ to `mcjs` and it will produce the result:

`$ mcjs index.js > bundle.js`
or
`$ cat index.js | mcjs > bundle.js`


Resulting _bundle.js_:

```js
var m_a, m_index;

var z = 123;
m_a = z;

var a = m_a;
module.exports = a;
```


##### 3. Post-process

You can then wrap _bundle.js_ with [UMD](https://github.com/ForbesLindesay/umd) for standalone build:

```
$ cat bundle.js | umd stansalone_name -c > bundle.js
```

And minify with [closurecompiler](https://github.com/dcodeIO/ClosureCompiler.js) with better compression:

```
$ ccjs bundle.js --language_in=ECMASCRIPT5 > bundle.min.js
```


# Motivation

As far closure compiler can expand any objects, if to merge modules into a single scope, which means to resolve global vars conflict and to replace all `module.exports` and `require` calls, then you get one-scoped bundle, which closure compiler compresses the way better than separated by scopes browserified/compiled bundle.

_Mcjs_ does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but avoids creating of `goog.provide`'s and makes variables more human-readable.


[![NPM](https://nodei.co/npm/mcjs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mcjs/)