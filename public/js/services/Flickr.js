define(function (require) {

	var Promise = require("Promise"),
		Tools = require("Tools"),
		jsonp = require("./jsonp");

	var DEFAULT_PROTOCOL = "http";
	var DEFAULT_PORT = 80;
	var DEFAULT_PATH = "/services/rest";

	require("querystring");

	return function FlickrConstructor() {

		var _config = null;

		// for testing
		this.jsonp = jsonp;

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
			var src = this.buildSrc(payload);
			jsonp.get(src);
		};

		this.buildSrc = function buildSrc(queryObject) {
			var withDefault = Tools.mixin(queryObject || {}, {
				api_key: _config.api_key
			});
			return _addQueryString(_addPath(_addPort(_addHostname(_addProtocol("")))), withDefault);
		};

		function _addProtocol(src) {
			src += _config.protocol || DEFAULT_PROTOCOL;
			return src + "://";
		}

		function _addHostname(src) {
			return src += _config.hostname;
		}

		function _addPort(src) {
			return src += ":" + (_config.port || DEFAULT_PORT);
		}

		function _addPath(src) {
			return src += _config.path || DEFAULT_PATH;
		}

		function _addQueryString(src, queryObject) {
			return src += "/?" + querystring.stringify(queryObject);
		}

	};

});