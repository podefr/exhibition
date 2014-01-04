var chai = require("chai"),
    FlickrAdapter = require("adapters/Flickr"),
    Flickr = require("services/Flickr"),
    Promise = require("Promise");

    require("sinon");

var expect = chai.expect;

describe('Flickr adapter', function(){

    var flickrAdapter = null,
        flickr = null,
        promise = null;

    beforeEach(function () {
        flickr = new Flickr();
        flickrAdapter = new FlickrAdapter();
        sinon.mock(flickr);
        flickrAdapter.setFlickr(flickr);
        promise = new Promise();
    });

    it("gets a flickr object for calling its API", function () {
        flickrAdapter.setFlickr(flickr);
        expect(flickrAdapter.getFlickr()).to.equal(flickr);
    });

    it("can do an API call", function () {
        flickrAdapter.requests.myMethod = sinon.spy();
        sinon.stub(promise, "then");
        sinon.stub(flickr, "promiseApiCall").returns(promise);

        flickrAdapter.doApiCall("myMethod", 1, 2, 3);

        expect(flickrAdapter.requests.myMethod.calledWith(1, 2, 3)).to.be.true;

        var then = promise.then.args[0][0];

        expect(function () {
            then({
                stat: "fail"
            });
        }).to.throw(/Flickr API call/);

        var resultOk = {};

        expect(then(resultOk)).to.equal(resultOk);

    });

    it("gets the user id given a username", function () {
        var request = flickrAdapter.requests.getUserId("podefr");

        expect(request.method).to.equal("flickr.people.findByUsername");
        expect(request.username).to.equal("podefr");
    });

    it("gets all the photosets given a userId", function () {
        var request = flickrAdapter.requests.getPhotosets("123");

        expect(request.method).to.equal("flickr.photosets.getList");
        expect(request.user_id).to.equal("123");
    });

    it("gets the collections tree", function () {
        var request = flickrAdapter.requests.getCollections("123");

        expect(request.method).to.equal("flickr.collections.getTree");
        expect(request.user_id).to.equal("123");
    });

    it("gets all the photos in a gallery", function () {
        var request = flickrAdapter.requests.getPhotosForPhotoset("gallery123");

        expect(request.method).to.equal("flickr.photosets.getPhotos");
        expect(request.photoset_id).to.equal("gallery123");
    });

    it("has an init function that calls getUserID", function () {

    });

});