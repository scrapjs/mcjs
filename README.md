Flatten CommonJS modules. [WIP]

As far closure compiler can quite easily expand any objects, if to merge modules into the single scope, which means to resolve global vars conflict, to replace all `module.exports` and `require` declarations, then you will get one-scoped bundle, which closure compiler in theory should compress the way better than separated by scopes browserify bundle.

That way reminds the times when you didn’t use common js modules and just placed code in one file (ill practice).

#### Sources:

###### `a.js`

```js
var z = 123;
module.exports = {
	x: 1,
	y: z
};
```

###### `index.js`

```js
var a = require('a');
var z = 456;
```

###### `$ uncommon index.js`

```js
var a_z = 123;
var a_exports = {
	x:1,
	y:module_a_z
}
var a = module_a;
```

So it does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but it avoids creating of `goog.provide`'s and makes variables more human-readable.

It’s best as pre-closurecompiler task:

```
"cat": "uncommon src/*.js index.js > dist/bundle.js"
"min": "ccjs --compilation_level=ADVANCED_OPTIMIZATIONS dist/bundle.js > dist/bundle.min.js"
```