Flatten CommonJS modules.
As far closure compiler can quite easily expand scopes (so that means modules), you just have to expand modules to global scope as a variables with non-interfering other first-class variables.

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

#### `$ uncommon index.js`

```js
var a_z = 123;
var a_exports = {
	x:1,
	y:module_a_z
}
var a = module_a;
```

So it does the same task as a ClosureCompiler with `--process_commonjs_modules` flag, but it avoids creating of `goog.provide`'s and makes variables more human-readable, as if you use Erlang or etc.

It’s the best to use as pre-closurecompiler task:

```
"cat": "uncommon src/*.js index.js > dist/bundle.js"
"min": "ccjs --compilation_level=ADVANCED_OPTIMIZATIONS dist/bundle.js > dist/bundle.min.js"
```