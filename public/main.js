define(function (require) {

	var config = require("./config.js"),
		Flickr = require("js/services/Flickr"),
		FlickrAdapter = require("js/adapters/Flickr"),
		Exhibition = require("js/Exhibition");

	// Init Flickr
	var flickr = new Flickr();
	flickr.setConfig(config.Flickr.host);

	// Init Flickr adapter
	var flickrAdapter = new FlickrAdapter(flickr);
	flickrAdapter.init(config.Flickr.username).then(null, function (err) {
		console.error("Failed initializing the flickr Adapter.", err)
	});

	// Init Exhibition
	var mainDom = document.querySelector(".main");
	var exhibition = new Exhibition(flickrAdapter, mainDom);

	// Start exhibition
	exhibition.start();

	function onError(err) {
		console.error(err);
	}


});