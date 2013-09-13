define(function (require) {

	var tools = require("Tools"),
		Store = require("Store");

	return function FlickrAdapterConstructor($flickr) {

		var _flickr = $flickr || null,

		_photosets = new Store([]),

		_collections = new Store([]),

		_photos = new Store({});

		this.requests = {
			getUserId: function getUserId(username) {
				return {
					method: "flickr.people.findByUsername",
					username: username
				};
			},

			getPhotosets: function getPhotosets(userId) {
				return {
					method: "flickr.photosets.getList",
					user_id: userId
				}
			},

			getCollections: function getCollections(userId) {
				return {
					method: "flickr.collections.getTree",
					user_id: userId
				}
			},

			getPhotosForPhotoset: function getPhotosForPhotoset(photosetId) {
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
			var userId = "";

			return this.doApiCall("getUserId", username)

			.then(function setUserId(result) {
				userId = result.user.id;
			})

			.then(function getCollections() {
				return this.doApiCall("getCollections", userId);
			}, this)

			.then(function (collections) {
				_collections.reset(collections.collections.collection);
			}, this)

			.then(function getPhotosets() {
				return this.doApiCall("getPhotosets", userId);
			}, this)

			.then(function (photoset) {
				_photosets.watch("added", this.onAddPhotoset, this);
				_photosets.reset(photoset.photosets.photoset);
			}, this);

		};

		this.onAddPhotoset = function onAddPhotoset(index, photoset) {
			this.doApiCall("getPhotosForPhotoset", photoset.id)

			.then(function (result) {
				_photos.set(photoset.id, result.photoset.photo);
			});
		};

		this.getPhotosets = function getPhotosets() {
			return _photosets.proxy("map", function (photoset) {
				return {
					server: photoset.server,
					id: photoset.primary,
					photoset_id: photoset.id,
					secret: photoset.secret,
					farm: photoset.farm,
					title: photoset.title._content
				};
			});
		};

		this.getPhotosFromPhotoset = function getPhotosFromPhotoset(photosetId) {
			return _photos.get(photosetId);
		};

		this.subscribeToPhotosetChanges = function subscribeToPhotosetChanges(id, func, scope) {
			return _photos.watchValue(id, func, scope);
		};

		this.unsubscribeToPhotosetChanges = function unsubscribeToPhotosetChanges(handle) {
			return handle && _photos.unwatchValue(handle);
		};

		this.getPhotoset = function getPhotoset(index) {
			return _photosets.get(index).map(function (photo) {
				return {
					server: photo.server,
					id: photo.primary,
					photoset_id: photo.id,
					secret: photo.secret,
					farm: photo.farm,
					title: photo.title._content
				};
			});
		};

		this.getPhotosetById = function getPhotosetById(id) {
			var returnPhotoset;

			_photosets.proxy("some", function (photoset) {
				if (photoset.id == id) {
					returnPhotoset = photoset;
					return true;
				}
			});

			return returnPhotoset;
		};

		this.getCollections = function getCollections() {
			return _collections.proxy("map", function (collection) {
				var photosetId = collection.set[0].id,
					photo = this.getPhotosetById(photosetId);
				return {
					collection_id: collection.id,
					server: photo.server,
					id: photo.primary,
					secret: photo.secret,
					farm: photo.farm,
					title: collection.title,
					description: collection.description,
					iconlarge: collection.iconlarge,
					iconesmall: collection.iconsmall
				}
			}, this);
		};

		this.getPhotosetsForCollection = function getPhotosetsForCollection(collectionId) {
			var collection;

			_collections.proxy("some", function (coll) {
				if (coll.id == collectionId) {
					collection = coll;
					return true;
				}
			})

			if (!collection) {
				return false;
			} else {
				return collection.set.map(function (photoset) {
					var photoset = this.getPhotosetById(photoset.id);
					return {
						collection_id: collection.id,
						photoset_id: photoset.id,
						server: photoset.server,
						id: photoset.primary,
						secret: photoset.secret,
						farm: photoset.farm,
						title: photoset.title._content,
					}
				}, this);
			}
		};


	};

});