define(function (require) {

	var chai = require("chai"),
		Flickr = require("services/Flickr");

		require("sinon");

	var expect = chai.expect;

	describe('Flickr', function(){

		var flickr = null;

		beforeEach(function () {
			flickr = new Flickr();
		});

		describe("initialisation", function () {

			it("takes a username", function () {
				expect(flickr.getUsername()).to.equal("");

				expect(flickr.setUsername()).to.equal(false);
				expect(flickr.setUsername("podefr")).to.equal(true);

				expect(flickr.getUsername()).to.equal("podefr");
			});

			it("takes a flickr api key", function () {
				expect(flickr.getApiKey()).to.equal("");

				expect(flickr.setApiKey()).to.equal(false);
				expect(flickr.setApiKey("key")).to.equal(true);

				expect(flickr.getApiKey()).to.equal("key");
			});

			it("gets the user id on init", function () {
				var promise = {};

				flickr.setUsername("podefr");

				sinon.stub(flickr, "apiCall").returns(promise);

				expect(flickr.init()).to.equal(promise);

				expect(flickr.apiCall.args[0][0].method).to.equal("flickr.people.findByUsername");
				expect(flickr.apiCall.args[0][0].username).to.equal("podefr");
			});

		});

		describe("API calls", function () {

			it("")

		});

	});
});
