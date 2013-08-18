define(function (require) {

	var chai = require("chai"),
		jsonp = require("services/jsonp");

		require("sinon");

	var expect = chai.expect;

	describe('Jsonp', function(){

		it("does a jsonp request", function () {
			var scope = {},
				request = "http",
				script = {};

			sinon.stub(jsonp, "createScript").returns(script);
			sinon.stub(jsonp, "appendScript");

			expect(jsonp.get()).to.be.false;
			expect(jsonp.get(request)).to.be.true;

			expect(jsonp.createScript.calledWith(request));
			expect(jsonp.appendScript.calledWith(script));

			jsonp.createScript.restore();
			jsonp.appendScript.restore();
		});

		it("creates a script that removes itself on load", function () {
			var script = jsonp.createScript("src");

			expect(script.src.match(/src/));
			expect(script.nodeName).to.equal("SCRIPT");

			sinon.stub(jsonp, "removeScript");

			script.onload();

			expect(jsonp.removeScript.called);
		});

		it("adds the script to the header", function () {
			var appendChild = sinon.spy(),
				script = {};

			sinon.stub(document, "querySelector").returns({
				appendChild: appendChild
			});

			jsonp.appendScript({});

			expect(appendChild.calledWith(script));

			document.querySelector.restore();
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