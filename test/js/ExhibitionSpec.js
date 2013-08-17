define(function (require) {

	var chai = require("chai"),
		Exhibition = require("Exhibition");

		require("sinon");

	var expect = chai.expect;

	describe('test', function(){
	    it('stupid first test', function(){
	    	expect(true).to.equal(true);
	    	console.log(sinon.spy);
	  	});
	});
});
