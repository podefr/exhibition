define(function (require) {

	var chai = require("chai"),
		Jsonp = require("services/Jsonp");

		require("sinon");

	var expect = chai.expect;

	describe('Jsonp', function(){

		var jsonp = null,
			http = null,
			globalHandler = null;

		beforeEach(function () {
			jsonp = new Jsonp();
			sinon.mock(jsonp.http);
			sinon.mock(jsonp.qs);
			globalHandler = sinon.spy();
		});

		it("does a get request", function () {
			var callback = sinon.spy(),
				scope = {};

			jsonp.get({

			}, "", callback, scope);

		});

	});
});