define(function (require) {

	var Store = require("Store"),
		OObject = require("OObject"),
		Bind = require("Bind.plugin");

	return function CollageConstructor(flickr, dom) {

		var store = new Store(),
			collage = new OObject(),
			bind = new Bind(store);

		collage.plugins.addAll({
			bind: bind
		});

		collage.alive(dom);

		flickr.promiseApiCall({
			// get categories
		}).then(function () {
			store.reset();
		});

	};

});