define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Event = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools"),
		helpers = require("../adapters/helpers");

	function CollectionsConstructor($collections) {

		var viewModel = new Store($collections.map(function (collection) {
				collection.url = flickrContent.createUrl(collection, "z");
				return collection;
			})),
			bind = new Bind(viewModel, Tools.mixin({
				getId: function (item) {
					var index = viewModel.proxy("indexOf", item) +1 +"";
					this.innerHTML = index.length == 1 ? "0" + index  : index;
				}
			}, helpers)),
			eventPlugin = new Event(this);

		this.plugins.addAll({
			"bind": bind,
			"event": eventPlugin
		});

		this.drillin = function drillin(event, dom) {
			var collection = viewModel.get(bind.getItemIndex(dom));
			this.notify("drillin", collection.collection_id);
		};

	}

	return function CollectionsFactory($collections) {
		Tools.mixin(new OObject, CollectionsConstructor.prototype);
		Tools.mixin(new Observable, CollectionsConstructor.prototype);
		var collections = new CollectionsConstructor($collections);
		return collections;
	}

});