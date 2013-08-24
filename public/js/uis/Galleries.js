define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Content = require("uis/Content");

	return function Galleries(model, dom) {

		var gallery = new OObject(model),
			bind = new Bind(model);

		gallery.plugins.addAll({
			bind: bind(model)
		});

		gallery.alive(dom);

	};

});