define(function (require) {

	var chai = require("chai"),
		sinon = require("sinon"),
		Exhibition = require("Exhibition");

	var expect = chai.expect;


	describe('test', function(){
	    it('stupid first test', function(){
	    	expect(true).to.equal(true);
	    	console.log(sinon.useFakeXMLHttpRequest);
	  	});
	});
});
