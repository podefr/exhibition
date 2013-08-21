define(function (require) {

	var tools = require("Tools");

	return function FlickrAdapterConstructor($flickr) {

		var _flickr = $flickr || null,

		_userId = "";

		this.requests = {
			getUserId: function getUserId(username) {
				return {
					method: "flickr.people.findByUsername",
					username: username
				};
			}
		}

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
			});
		};

		this.init = function init(username) {
			return this.doApiCall("getUserId", username).then(function (result) {
				_userId = result.user.id;
			});
		};



	};

});