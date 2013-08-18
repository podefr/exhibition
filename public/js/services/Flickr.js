define(function (require) {

	var Promise = require("Promise"),
		Tools = require("Tools");

	return function FlickrConstructor() {

		var _username = "",
			_apiKey = "";

		this.setUsername = function setUsername(username) {
			if (typeof username == "string") {
				_username = username;
				return true;
			} else {
				return false;
			}
		};

		this.getUsername = function getUsername() {
			return _username;
		};

		this.setApiKey = function setApiKey(apiKey) {
			if (typeof apiKey == "string") {
				_apiKey = apiKey;
				return true;
			} else {
				return false;
			}
		};

		this.getApiKey = function getApiKey() {
			return _apiKey;
		};

		this.init = function init() {

			return this.apiCall({
				method: "flickr.people.findByUsername",
				username: _username
			});
		};

		this.apiCall = function apiCall(payload) {
			var actual = Tools.mixin({
				api_key: _apiKey,
				format: "json"
			}, payload),
			promise = new Promise();

			console.log("calling api with payload", actual);

			promise.fulfill({status: "ok"});

			return promise;
		};

	};

});