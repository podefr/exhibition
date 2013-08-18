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

			it("takes a config", function () {
				var config = {};
				expect(flickr.setConfig()).to.be.false;
				expect(flickr.setConfig(config)).to.be.true;
				expect(flickr.getConfig()).to.equal(config);
			});

		});

		describe("API calls", function () {

			it("throws an error if the config is not correctly set", function () {
				var request = {},
					callback = sinon.spy();

				flickr.setConfig({
					hostname: "flickr.com"
				});

				expect(function () {
					flickr.apiCall({}, callback);
				}).to.throw(Error, "To use Flickr, make sure that the config gets a hostname to the Flickr API and an api_key");

				flickr.setConfig({
					api_key: "123"
				});

				expect(function () {
					flickr.apiCall({}, callback);
				}).to.throw(Error, "To use Flickr, make sure that the config gets a hostname to the Flickr API and an api_key");

				expect(flickr.setConfig({
					hostname: "flickr.com",
					api_key: "123"
				})).to.be.true;
			});

			it("does a jsonp request", function () {

			});

		});

	});
});
