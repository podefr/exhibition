define(function (require) {

	var Promise = require("Promise"),
		Tools = require("Tools");

	return function FlickrConstructor() {

		var _username = "",
			_apiKey = "";

		this.setUsername = function setUsername(username) {
			_username = username;
		};

		this.setApiKey = function setApiKey(apiKey) {
			_apiKey = apiKey;
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