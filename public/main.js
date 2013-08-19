define(function (require) {

	var config = require("./config.js"),
		Flickr = require("js/services/Flickr"),
		flickrAdapter = require("js/adapters/Flickr"),
		Exhibition = require("js/Exhibition");

	// Init Flickr
	var flickr = new Flickr();
	flickr.setConfig(config.Flickr.host);


	// Init Exhibition
	var exhibition = new Exhibition();

	// Init grabs the user ID from the username and other stuff
	exhibition.setDataProvider(flickrAdapter);
	exhibition.start();


});