define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin");

	return function Galleries(model, dom) {

		var gallery = new OObject(),
			bind = new Bind(store);

		gallery.plugins.addAll({
			bind: bind(model)
		});

		gallery.alive(dom);

	};

});