define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Events = require("Event.plugin"),
		Store = require("Store"),
		Tools = require("Tools");

	function NavigationConstructor($router) {

		var viewModel = new Store(),
			bind = new Bind(viewModel),
			events = new Events(this);
			router = $router;

		this.plugins.addAll({
			"bind": bind,
			"events": events
		});

		this.back = function back() {
			router.back();
		};

		this.forward = function forward() {
			router.forward();
		};

	}

	return function NavigationFactory(router) {
		Tools.mixin(new OObject, NavigationConstructor.prototype);
		return new NavigationConstructor(router);
	}

});