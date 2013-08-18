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
			if (typeof request == "object" &&
					typeof jsonCallback == "function") {

				return true;
			} else {
				return false;
			}
		};

	};

});