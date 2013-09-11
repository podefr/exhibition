define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Event = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools");

	function CollectionsConstructor($collections) {

		var viewModel = new Store($collections),
			bind = new Bind(viewModel),
			eventPlugin = new Event(this);

		this.plugins.addAll({
			"bind": bind,
			"event": eventPlugin
		});

		viewModel.alter("map", function (collection) {
			collection.url = flickrContent.createUrl(collection, "z");
			return collection;
		});

		this.drillin = function drillin(event, dom) {
			//var gallery = viewModel.get(bind.getItemIndex(dom));
			//this.notify("drillin", gallery.galleryId);
		};

		this.setCollections = function setCollections(collectionsStore) {
			viewModel.reset(this.getFormattedCollections(collectionsStore));
		};

	}

	return function CollectionsFactory($collections) {
		Tools.mixin(new OObject, CollectionsConstructor.prototype);
		Tools.mixin(new Observable, CollectionsConstructor.prototype);
		var collections = new CollectionsConstructor($collections);
		return collections;
	}

});