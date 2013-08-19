define(function (require) {

	return function FlickrAdapterConstructor() {

		var _flickr = null,

		_userId = "";

		this.setFlickr = function setFlickr(flickr) {
			_flickr = flickr;
		};

		this.getFlickr = function getFlickr() {
			return _flickr;
		};

		this.getUserId = function getUserId() {
			return _userId;
		};

		this.init = function init(username) {
			var promise = _flickr.promiseApiCall({
				method: "flickr.people.findByUsername",
				username: username
			});

			promise.then(function (result) {
				_userId = result.user.id;
			});
		};

	};

});