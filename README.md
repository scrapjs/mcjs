# MCJS [![Build Status](https://travis-ci.org/dfcreative/mcjs.svg?branch=master)](https://travis-ci.org/dfcreative/mcjs) [![Code Climate](https://codeclimate.com/github/dfcreative/mcjs/badges/gpa.svg)](https://codeclimate.com/github/dfcreative/mcjs) [![deps](https://david-dm.org/dfcreative/mcjs.svg)](https://david-dm.org/dfcreative/mcjs) <a href="UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>

**M**erge **C**ommon **JS** modules into a single module.


## Some stats

Compare minified sources (via closure compiler):

| Package | Browserify | MCJS |  |
|---|---|---|---|---|
| [color-space](https://github.com/dfcreative/color-space) | 5kb | 4.4kb | 12% |
| [mcjs](https://github.com/dfcreative/color-space) | 4.02kb | 2.71kb | 32.6% |
| [mod](https://github.com/dfcreative/mod) | 16.5kb | 13kb | 27% |


# Use

`$ npm install -g mcjs`

The following files:

_a.js_:

```js
var z = 123;
module.exports = z;
```

_index.js_:
```js
var a = require('a');
module.exports = a;
```

Run `mcjs`:

`$ mcjs index.js`


Result:

```js
var m_a, m_index;

var z = 123;
m_a = z;

var a = m_a;
module.exports = a;
```

_MCJS_ produces a single module with all required modules declared as top-level variables and according require calls replaced with them.


# API

Pass a file or stdin to mcjs and it will produce the resulting module.

`$ mcjs index.js > bundle.js` or `$ cat index.js | mcjs > bundle.js`


### --wrap, -w

You can wrap the result as `mcjs --wrap='before %output% after'`, to apply your own wrapper, like `mcjs -w='window.Plugin=Plugin;%output%'`.



# Motivation

As far closure compiler can quite easily expand any objects, if to merge modules into a single scope, which means to resolve global vars conflict and replace all `module.exports` and `require` calls, then you get one-scoped bundle, which closure compiler compresses the way better than separated by scopes browserified bundle.

Mcjs does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but avoids creating of `goog.provide`'s and makes variables more human-readable.


[![NPM](https://nodei.co/npm/mcjs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mcjs/)