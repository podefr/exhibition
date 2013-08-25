define(function (require) {

	var chai = require("chai"),
		flickrContent = require("services/flickrContent");

		require("sinon");

	var expect = chai.expect;

	describe('Content displays Flickr content', function(){

		var testContent = {
			farm: "1",
			server: "2828",
			id: "123",
			secret: "1a2"
		};

		it("can create the url given a content", function () {
			expect(flickrContent.createUrl()).to.be.false;
			expect(flickrContent.createUrl(testContent)).to
				.equal("http://farm1.staticflickr.com/2828/123_1a2.jpg");
		});

		it("update can create the url with a size", function () {
			expect(flickrContent.createUrl(testContent, "m")).to
				.equal("http://farm1.staticflickr.com/2828/123_1a2_m.jpg");
		});

	});
});
