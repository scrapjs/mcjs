* How to reuse modules required?
	* Use list & map of dependencies.
	* Use sigmund for marking objects, try to merge them if they’re repeated.

* What’s an ideal result?
	* As if you write everything in a single file: everything placed to the exports objects gets own global name, exports objects itself as well.
	* What about binding to `this` within exports objects?
		* In that case it has to keep property on it.