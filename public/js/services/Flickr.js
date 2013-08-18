define(function (require) {

	var Promise = require("Promise"),
		Tools = require("Tools"),
		jsonp = require("./jsonp");

	var DEFAULT_PROTOCOL = "http";
	var DEFAULT_PORT = 80;
	var DEFAULT_PATH = "/services/rest";

	require("querystring");

	return function FlickrConstructor() {

		var _config = null,

		_callbacks = [];

		// for testing
		this.jsonp = jsonp;

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

		this.apiCall = function apiCall(payload, callback, scope) {
			assertConfig();
			var src;

			if (typeof callback == "function") {
				this.useUserCallback(payload, callback, scope);
			}

			src = this.buildSrc(payload);
			jsonp.get(src);
		};

		this.promiseApiCall = function promiseApiCall(payload) {
			assertConfig();
			var promise = new Promise();
			this.apiCall(payload, function () {
				promise.fulfill.apply(promise, arguments);
			});
			return promise;
		};

		this.useUserCallback = function useUserCallback(payload, callback, scope) {
			var randomId = this.generateRandomId();
			this.addCallbackIdToPayload(payload, randomId);
			this.wrapCallback(randomId, callback, scope);
		};

		this.buildSrc = function buildSrc(queryObject) {
			var withDefault = Tools.mixin(queryObject || {}, {
				api_key: _config.api_key,
				format: "json"
			});
			return _addQueryString(_addPath(_addPort(_addHostname(_addProtocol("")))), withDefault);
		};

		this.generateRandomId = function generateRandomId() {
			var random = "flickr_cb_" + Math.floor(Math.random() * 999999999) + (Date.now());

			if (this.hasCallback(random)) {
				return this.randomCallback();
			} else {
				return random;
			}
		};

		this.hasCallback = function hasCallback(id) {
			return _callbacks.indexOf(id) >= 0;
		};

		this.wrapCallback = function wrapCallback(callbackId, callback, scope) {
			_callbacks.push(callbackId);
			window[callbackId] = function () {
				callback.apply(scope, arguments);
				this.removeRandomCallback(callbackId);
			}.bind(this);
		};

		this.addCallbackIdToPayload = function addCallbackIdToPayload(payload, callbackId) {
			payload.jsoncallback = callbackId;
		};

		this.removeRandomCallback = function removeRandomCallback(id) {
			var index = _callbacks.splice(_callbacks.indexOf(id), 1);
			delete window[id];
		};

		this.currentCalls = function currentCalls() {
			return _callbacks.length;
		};

		// PRIVATE FUNCTIONS
		function assertConfig() {
			if (typeof _config.hostname != "string" ||
				typeof _config.api_key != "string") {
				throw new Error("To use Flickr, make sure that the config gets a hostname to the Flickr API and an api_key");
			}
		}

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