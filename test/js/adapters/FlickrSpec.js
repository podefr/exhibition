define(function (require) {

	var chai = require("chai"),
		FlickrAdapter = require("adapters/Flickr"),
		Flickr = require("services/Flickr"),
		Promise = require("Promise");

		require("sinon");

	var expect = chai.expect;

	describe('Flickr adapter', function(){

		var flickrAdapter = null,
			flickr = null;

		beforeEach(function () {
			flickr = new Flickr();
			flickrAdapter = new FlickrAdapter();
			sinon.mock(flickr);
			flickrAdapter.setFlickr(flickr);
		});

		it("gets a flickr object for calling its API", function () {
			flickrAdapter.setFlickr(flickr);
			expect(flickrAdapter.getFlickr()).to.equal(flickr);
		});

		it("gets the user id given a username", function () {
			var request = flickrAdapter.requests.getUserId("podefr");

			expect(request.method).to.equal("flickr.people.findByUsername");
			expect(request.username).to.equal("podefr");
		});

		it("has an init function that calls getUserID", function () {

		});

	});
});
