define(function (require) {

	var chai = require("chai"),
		Content = require("uis/Content");

		require("sinon");

	var expect = chai.expect;

	describe('Content displays Flickr content', function(){

		var content = null,
			testContent = {
				farm: "1",
				server: "2828",
				id: "123",
				secret: "1a2"
			};

		beforeEach(function () {
			content = new Content();
		});

		it("accepts a flickr content (photo or video)", function () {
			expect(function () { content.setContent(); }).to.throw(Error);
			expect(function () { content.setContent({}); }).to.throw(Error);

			expect(content.setContent(testContent)).to.be.true;
			expect(content.getContent()).to.equal(testContent);
		});

		it("can create the url given a content", function () {
			expect(content.createUrl()).to.be.false;
			content.setContent(testContent);
			expect(content.createUrl()).to
				.equal("http://farm1.staticflickr.com/2828/123_1a2.jpg");
		});

		it("can specify a size", function () {
			expect(content.getSize()).to.equal("");
			expect(content.setSize()).to.be.false;
			expect(content.setSize("a")).to.be.true;
		});

		it("update can create the url with a size", function () {
			content.setContent(testContent);
			content.setSize("m");

			expect(content.createUrl()).to
				.equal("http://farm1.staticflickr.com/2828/123_1a2_m.jpg");
		});

	});
});
