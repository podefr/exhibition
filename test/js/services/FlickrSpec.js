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

				expect(src).to.equal("http://flickr.com:80/services/rest/?api_key=123&format=json");
			});

			it("accepts other query strings", function () {
				var src = flickr.buildSrc({
					method: "getPhoto"
				});

				expect(src).to.equal("http://flickr.com:80/services/rest/?api_key=123&format=json&method=getPhoto");
			});

			it("does a jsonp request", function () {
				sinon.stub(flickr.jsonp, "get");
				sinon.stub(flickr, "buildSrc").returns("url");

				var request = { method: "getPhotos" };

				flickr.apiCall(request);

				expect(flickr.buildSrc.calledWith(request)).to.be.true;
				expect(flickr.jsonp.get.calledWith("url")).to.be.true;

				flickr.jsonp.get.restore();
			});

			it("can generate a random and unused callback id", function () {
				var random,
					expected;

				sinon.stub(flickr, "hasCallback", function () {
					expect(flickr.hasCallback.callCount).to.equal(1);
					expected = flickr.hasCallback.args[0][0];
					return false;
				});

				random = flickr.generateRandomId();

				expect(random).to.equal(expected);

				flickr.hasCallback.restore();
			});

			it("can tell if a callback already exists", function () {
				flickr.wrapCallback("123", sinon.spy());

				expect(flickr.hasCallback("123")).to.be.true;

			});

			it("can wrap a user callback in a randomly generated one", function () {
				var callback = sinon.spy(),
					scope = {};

				flickr.wrapCallback("flickr_cb_123", callback, scope);

				expect(typeof window.flickr_cb_123).to.equal("function");

				window.flickr_cb_123(1, 2, 3);

				expect(callback.calledWith(1, 2, 3)).to.be.true;
				expect(callback.thisValues[0]).to.equal(scope);
			});

			it("can remove the random callback", function () {
				window.flickr_cb_123 = function () {};

				flickr.removeRandomCallback("flickr_cb_123");

				expect(window.flickr_cb_123).to.equal.undefined;
			});

			it("removes the random callback after execution", function () {
				sinon.spy(flickr, "removeRandomCallback");

				flickr.wrapCallback("flickr_cb_123", function () {});

				window.flickr_cb_123();

				expect(flickr.removeRandomCallback.calledWith("flickr_cb_123")).to.be.true;

				flickr.removeRandomCallback.restore();
			});

			it("can tell how many API calls are being made", function () {
				flickr.wrapCallback("123");
				flickr.wrapCallback("456");
				expect(flickr.currentCalls()).to.equal(2);
			});

			it("can use a user callback instead of the default flickr one", function () {
				sinon.stub(flickr, "generateRandomId").returns("flickr_cb_123");
				sinon.spy(flickr, "addCallbackIdToPayload");
				sinon.spy(flickr, "wrapCallback");

				var callback = sinon.spy(),
					scope = {},
					payload = {};

				flickr.useUserCallback(payload, callback, scope);

				expect(flickr.generateRandomId.called).to.be.true;
				expect(flickr.addCallbackIdToPayload.calledWith(payload, "flickr_cb_123")).to.be.true;
				expect(flickr.wrapCallback.calledWith("flickr_cb_123", callback, scope)).to.be.true;

				expect(payload.jsoncallback).to.equal("flickr_cb_123");

				flickr.generateRandomId.restore();
			});

			it("can take an optional callback to override the default flickr callback", function () {
				sinon.spy(flickr, "useUserCallback");
				var payload = {},
					callback = function () {},
					scope = {};

				flickr.apiCall(payload, callback, scope);

				expect(flickr.useUserCallback.calledWith(payload, callback, scope)).to.be.true;
			});

		});

	});
});
