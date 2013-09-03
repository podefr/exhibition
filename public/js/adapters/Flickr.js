define(function (require) {

	var tools = require("Tools"),
		Store = require("Store");

	return function FlickrAdapterConstructor($flickr) {

		var _flickr = $flickr || null,

		_galleries = new Store([]),

		_photos = new Store({});

		this.requests = {
			getUserId: function getUserId(username) {
				return {
					method: "flickr.people.findByUsername",
					username: username
				};
			},

			getGalleries: function getGalleries(userId) {
				return {
					method: "flickr.photosets.getList",
					user_id: userId
				}
			},

			getPhotosForGallery: function getPhotosForGallery(photosetId) {
				return {
					method: "flickr.photosets.getPhotos",
					photoset_id: photosetId
				}
			}
		};

		this.setFlickr = function setFlickr(flickr) {
			_flickr = flickr;
		};

		this.getFlickr = function getFlickr() {
			return _flickr;
		};

		this.doApiCall = function doApiCall() {
			var request = this.requests[arguments[0]].apply(null, tools.toArray(arguments).splice(1));

			return _flickr.promiseApiCall(request)

			.then(function assertResult(result) {
				if (result.stat == "fail") {
					console.error("Flickr API call ", request, " failed with error ", result);
					throw new Error("Flickr API call ", request, " failed with error ", result);
				}
				return result;
			});
		};

		this.init = function init(username) {
			return this.doApiCall("getUserId", username)

			.then(function getGalleries(result) {
				return this.doApiCall("getGalleries", result.user.id);
			}, this)

			.then(function (galleries) {
				_galleries.watch("added", this.onAddGallery, this);
				_galleries.reset(galleries.photosets.photoset);
			}, this);

		};

		this.onAddGallery = function onAddGallery(index, gallery) {
			var store = new Store();
			_photos.set(gallery.id, store);

			this.doApiCall("getPhotosForGallery", gallery.id)

			.then(function (result) {
				store.reset(result.photoset.photo);
			});
		};

		this.getGalleries = function getGalleries() {
			return _galleries;
		};

		this.getGallery = function getGallery(id) {
			return _photos.get(id);
		};


	};

});