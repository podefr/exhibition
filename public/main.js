define(function (require) {

	var config = require("./config.js"),
		Flickr = require("js/services/Flickr"),
		Exhibition = require("js/Exhibition");

	// Init Flickr
	var flickr = new Flickr();
	flickr.setUsername(config.Flickr.username);
	flickr.setApiKey(config.Flickr.api_key);


	// Init Exhibition
	var exhibition = new Exhibition();

	// Init grabs the user ID from the username and other stuff
	flickr.init().then(function () {
		exhibition.setDataProvider(flickr);
		exhibition.start();
	});


});