## Merge CommonJS modules

As far closure compiler can quite easily expand any objects, if to merge modules into a single scope, which means to resolve global vars conflict and replace all `module.exports` and `require` declarations, then you will get one-scoped bundle, which closure compiler compresses the way better than separated by scopes browserify bundle.

With [mod.js](https://github.com/dfcreative/mod) _uncommon_ gives _13kb_ minified code vs _16.5kb_ of browserify.


#### Use

###### `$ npm install -g uncommonjs` or `$ npm install uncommonjs`


```js
// a.js

var z = 123;
module.exports = {
	x: 1,
	y: z
};
```


```js
// index.js

var a = require('a');
var z = 456;

exports = z;
```

###### `$ uncommon index.js > bundle.js` or `$ cat index.js | uncommon > bundle.js`

```js
// bundle.js

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


So it does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but it avoids creating of `goog.provide`'s and makes variables more human-readable.

It’s best as a pre-closurecompiler task:

```
"cat": "uncommon src/*.js index.js > dist/bundle.js"
"min": "ccjs --compilation_level=ADVANCED_OPTIMIZATIONS dist/bundle.js > dist/bundle.min.js"
```
