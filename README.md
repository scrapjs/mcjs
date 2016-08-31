# MCJS [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)


**M**erge **C**ommon **JS** modules into a single module.

_MCJS_ produces a single module with all inner requirements merged into a single scope with resolved name conflicts. That way it gains maximum compressability and minimal overhead. Smaller than [browserify](), [component](), [webpack](), [powerbuild](), [small](https://www.npmjs.com/package/small).

## Some stats

Compare minified gzip-sizes:

| Package | Browserify | [bundle-collapser](https://npmjs.org/package/bundle-collapser) | MCJS | Effect |
|---|---|---|---|---|---|
| [plotly.js](https://github.com/plotly/plotly.js) | 516kb | 508kb | 494kb | 4.5% |
| [color-space](https://github.com/dfcreative/color-space) | 5kb |  | 4.4kb | 12% |
| [mcjs](https://github.com/dfcreative/color-space) | 4.02kb |  | 2.71kb | 32.6% |
| [mod](https://github.com/dfcreative/mod) | 16.5kb |  | 13kb | 27% |


# Usage

#### Install

`$ npm install mcjs`

Use as a browserify plugin:

```sh
browserify index.js -p mcjs/plugin
```


#### Build

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

Run `mcjs`:

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


# Motivation

Closure compiler can expand any objects, so if to merge modules into a single scope, which means to resolve global vars conflict and to replace all `module.exports` and `require` calls, then we get one-scoped bundle, which closure compiler compresses the way better than separated by scopes browserified/compiled bundle.

_Mcjs_ does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but avoids creating of `goog.provide`'s and makes variables more human-readable.


[![NPM](https://nodei.co/npm/mcjs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mcjs/)


## Reference

* [The cost of small modules](https://nolanlawson.com/2016/08/15/the-cost-of-small-modules/)
