var flickr = require("jsonp-flickr"),
    FlickrAdapter = require("./adapters/Flickr"),
    Exhibition = require("./Exhibition");

module.exports = {
	init: function init(config) {

		// Init Flickr adapter
		var flickrAdapter = new FlickrAdapter(flickr, config.Flickr.api_key, config.Flickr.collection);

		// Init Exhibition
		var exhibition = new Exhibition(flickrAdapter);

		// Setup
		var contact = document.querySelector(".contact-link");
		contact.innerHTML = config.Exhibition.mail.text;
		contact.href = "mailto:" + config.Exhibition.mail.address;
		if (config.Exhibition.title) {
		    document.title = config.Exhibition.title;
		}

		var hompeage = document.querySelector(".logo-container").href = config.Exhibition.homepage.

		flickrAdapter.init(config.Flickr.username).then(function () {
		    // Start exhibition
		    exhibition.start();
		}, function (err) {
		    console.error("Failed initializing the flickr Adapter.", err)
		});

	}
};