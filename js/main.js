var config = require("./config.js"),
    flickr = require("jsonp-flickr"),
    FlickrAdapter = require("./adapters/Flickr"),
    Exhibition = require("js/Exhibition");

// Init Flickr adapter
var flickrAdapter = new FlickrAdapter(flickr, config.Flickr.api_key);

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