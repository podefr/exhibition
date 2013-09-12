define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Events = require("Event.plugin"),
		Observable = require("Observable"),
		Tools = require("Tools");

	function NavigationConstructor() {

		var events = new Events(this);

		this.plugins.addAll({
			"events": events
		});

		this.back = function back() {
			this.notify("back");
		};

		this.home = function home() {
			this.notify("home");
		};

	}

	return function NavigationFactory() {
		Tools.mixin(new OObject, NavigationConstructor.prototype);
		Tools.mixin(new Observable, NavigationConstructor.prototype);
		return new NavigationConstructor();
	}

});