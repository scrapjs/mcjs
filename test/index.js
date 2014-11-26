//TODO: build mocha (tests should pass)

//TODO: build assert

//TODO: build chai


var uncommon = require('../index');


describe('Options', function(){
	it.skip('uncommon', function(){
		uncommon();
	});

	//include require fn
	it.skip('uncommon -r module -r sub/module', function(){

	});

	//provide global var with proper name
	it.skip('uncommon -s module', function(){

	});

	//provide specific names for exported modules
	it.skip('uncommon -r module:x -r sub/module:y ', function(){

	});

	//ignore module to include (provide global getter)
	it.skip('uncommon -i', function(){

	});

	//keep comments in exported file
	it.skip('uncommon -c', function(){

	});

	//provide source maps for includes
	it.skip('uncommon -d', function(){

	});

	//default output package wrapper (no wrap by default)
	it.skip('uncommon -w=...', function(){

	});

	//show help
	it.skip('uncommon -h', function(){

	});

	//show version of uncommon
	it.skip('uncommon -v', function(){

	});

	//basedir for input stream (default is currDir)
	it.skip('uncommon -b', function(){

	});
});


describe('Edge cases', function(){

});