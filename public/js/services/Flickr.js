define(function (require) {

	var Promise = require("Promise"),
		Tools = require("Tools"),
		jsonp = require("./jsonp");

	return function FlickrConstructor() {

		var _config = null;

		function assertConfig() {
			if (typeof _config.hostname != "string" ||
				typeof _config.api_key != "string") {
				throw new Error("To use Flickr, make sure that the config gets a hostname to the Flickr API and an api_key");
			}
		}

		this.setConfig = function setConfig(config) {
			if (typeof config == "object") {
				_config = config;
				return true;
			} else {
				return false;
			}
		};

		this.getConfig = function getConfig() {
			return _config;
		};

		this.apiCall = function apiCall(payload) {
			assertConfig();
		};

	};

});