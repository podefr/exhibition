define(function (require) {

	return {

		get: function get(request) {
			if (typeof request == "string") {
				this.appendScript(this.createScript(request));
				return true;
			} else {
				return false;
			}
		},

		createScript: function createScript(src) {
			var script = document.createElement("script");
			script.src = src;
			script.onload = function () {
				this.removeScript(script);
			}.bind(this);
			return script;
		},

		appendScript: function appendScript(script) {
			document.querySelector("head").appendChild(script);
		},

		removeScript: function removeScript(script) {
			script.parentElement.removeChild(script);
		}

	};

});