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

	// Init Exhibition
	var exhibition = new Exhibition(flickrAdapter);

	// Setup
	var contact = document.querySelector(".contact-link");
	contact.innerHTML = config.Exhibition.mail.text;
	contact.href = "mailto:" + config.Exhibition.mail.address;
	if (config.Exhibition.title) {
		document.title = config.Exhibition.title;
	}

	flickrAdapter.init(config.Flickr.username).then(function () {
		// Start exhibition
		exhibition.start();
	}, function (err) {
		console.error("Failed initializing the flickr Adapter.", err)
	});



});