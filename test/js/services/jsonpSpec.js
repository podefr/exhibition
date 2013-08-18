define(function (require) {

	var chai = require("chai"),
		Jsonp = require("services/Jsonp");

		require("sinon");

	var expect = chai.expect;

	describe('Jsonp', function(){

		var jsonp = null,
			http = null,
			jsonCallback = null;

		beforeEach(function () {
			jsonp = new Jsonp();
			sinon.mock(jsonp.http);
			sinon.mock(jsonp.qs);
			jsonCallback = sinon.spy();
		});

		it("does a get request", function () {
			var scope = {},
				request = {};

			expect(jsonp.get()).to.be.false;
			expect(jsonp.get(request)).to.be.false;
			expect(jsonp.get(request, jsonCallback)).to.be.true;

		});

	});
});