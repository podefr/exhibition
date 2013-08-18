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

			beforeEach(function () {
				flickr.setConfig({
					hostname: "flickr.com",
					api_key: "123"
				});
				sinon.mock(flickr.jsonp);
			});

			afterEach(function () {
			});

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

			it("builds a url based on the config and the querystring object", function () {
				var src = flickr.buildSrc();

				expect(src).to.equal("http://flickr.com:80/services/rest/?api_key=123");
			});

			it("accepts other query strings", function () {
				var src = flickr.buildSrc({
					method: "getPhoto"
				});

				expect(src).to.equal("http://flickr.com:80/services/rest/?api_key=123&method=getPhoto");
			});

			it("does a jsonp request", function () {
				sinon.stub(flickr.jsonp, "get");
				sinon.stub(flickr, "buildSrc").returns("url");

				var request = { method: "getPhotos" };

				flickr.apiCall(request);

				expect(flickr.buildSrc.calledWith(request));
				expect(flickr.jsonp.get.calledWith("url"));

				flickr.jsonp.get.restore();
			});

		});

	});
});
