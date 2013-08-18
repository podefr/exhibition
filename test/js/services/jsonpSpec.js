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

		it("does a jsonp request", function () {
			var scope = {},
				request = "http";

			sinon.stub(jsonp, "createScript");

			expect(jsonp.get()).to.be.false;
			expect(jsonp.get(request)).to.be.false;
			expect(jsonp.get(request, jsonCallback)).to.be.true;

			expect(jsonp.createScript.calledWith(request));
		});

		it("creates a script that removes itself on load", function () {
			var script = jsonp.createScript("src");

			expect(script.src.match(/src/));
			expect(script.nodeName).to.equal("SCRIPT");

			sinon.stub(jsonp, "removeScript");

			script.onload();

			expect(jsonp.removeScript.called);
		});

		it("can remove a previously added script", function () {
			var script = {
				parentElement: {
					removeChild: sinon.spy()
				}
			};

			jsonp.removeScript(script);

			expect(script.parentElement.removeChild.calledWith(script));
		});

	});
});