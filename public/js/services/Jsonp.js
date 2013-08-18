define(function (require) {

	require("http");
	require("querystring");

	return function JsonpConstructor() {

		/**
		 * The poor's DI
		 */
		this.http = http;
		this.qs = querystring;

		this.get = function get(request, jsonCallback, scope) {
			if (typeof request == "string" &&
					typeof jsonCallback == "function") {

				return true;
			} else {
				return false;
			}
		};

		this.createScript = function createScript(src) {
			var script = document.createElement("script");
			script.src = src;
			script.onload = function () {
				this.removeScript(script);
			}.bind(this);
			return script;
		};

		this.appendScript = function appendScript(script) {
			document.querySelector("head").appendChild(script);
		};

		this.removeScript = function removeScript(script) {
			script.parentElement.removeChild(script);
		};

	};

});