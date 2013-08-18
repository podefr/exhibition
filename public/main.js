define(function (require) {

	var config = require("./config.js"),
		Flickr = require("js/services/Flickr"),
		Exhibition = require("js/Exhibition");

	// Init Flickr
	var flickr = new Flickr();
	flickr.setConfig(config.Flickr.host);

	flickr.apiCall({
		method: "flickr.photoSets.getList",
		user_id :"99824371@N03"
	}, function () {
		console.log(arguments);
	})


	// Init Exhibition
	var exhibition = new Exhibition();

	// Init grabs the user ID from the username and other stuff
	exhibition.setDataProvider(flickr);
	exhibition.start();


});