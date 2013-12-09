define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Event = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools"),
		helpers = require("../adapters/helpers");

	function PhotosetsConstructor() {

		var viewModel = new Store(),
			bind = new Bind(viewModel, helpers),
			eventPlugin = new Event(this);

		this.plugins.addAll({
			"bind": bind,
			"event": eventPlugin
		});

		this.drillin = function drillin(event, dom) {
			var photoset = viewModel.get(bind.getItemIndex(dom));
			this.notify("drillin", photoset.photoset_id);
		};

		this.setPhotosets = function setPhotosets(photosets) {
			viewModel.reset(photosets.map(function (photoset) {
				photoset.url = flickrContent.createUrl(photoset, "z");
				return photoset;
			}));
		};

	}

	return function PhotosetsFactory() {
		Tools.mixin(new OObject, PhotosetsConstructor.prototype);
		Tools.mixin(new Observable, PhotosetsConstructor.prototype);
		return new PhotosetsConstructor();
	}

});