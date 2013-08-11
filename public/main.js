define(function (require) {

	var config = require("./config.js"),
		Flickr = require("js/services/Flickr"),
		FlickrAdapter = require("js/adapters/FlickrAdapter"),
		Exhibition = require("js/Exhibition");

	// Init Flickr
	var flickr = new Flickr();
	flickr.setUsername(config.Flickr.username);
	flickr.setApiKey(config.Flickr.api_key);

	// Init adapter
	var flickrAdapter = new FlickrAdapter(flickr);

	// Init Exhibition
	var exhibition = new Exhibition();

	// Init grabs the user ID from the username and other stuff
	flickr.init().then(function () {
		exhibition.setDataProvider(flickrAdapter);
		exhibition.start();
	});


});