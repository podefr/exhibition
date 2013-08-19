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
		});

		it("gets a flickr object for calling its API", function () {
			flickrAdapter.setFlickr(flickr);
			expect(flickrAdapter.getFlickr()).to.equal(flickr);
		});

		it("has an init function that gets the username", function () {
			var promise = new Promise();
			sinon.stub(flickr, "promiseApiCall").returns(promise);
			flickrAdapter.setFlickr(flickr);

			flickrAdapter.init("podefr");

			expect(flickr.promiseApiCall.called).to.be.true;
			expect(flickr.promiseApiCall.args[0][0].method).to.equal("flickr.people.findByUsername");
			expect(flickr.promiseApiCall.args[0][0].username).to.equal("podefr");

			promise.fulfill({
				user: {
					id: "123"
				}
			});

			expect(flickrAdapter.getUserId()).to.equal("123");
		});

	});
});
