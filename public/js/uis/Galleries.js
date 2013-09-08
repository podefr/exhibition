define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Event = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools");

	function GalleriesConstructor() {

		var viewModel = new Store(),
			bind = new Bind(viewModel),
			eventPlugin = new Event(this);

		this.plugins.addAll({
			"bind": bind,
			"event": eventPlugin
		});

		this.drillin = function drillin(event, dom) {
			var gallery = viewModel.get(bind.getItemIndex(dom));
			this.notify("drillin", gallery.galleryId);
		};

		this.setGalleries = function setGalleries(galleriesStore) {
			viewModel.reset(this.getFormattedGalleries(galleriesStore));
		};

		this.getFormattedGalleries = function getFormattedGalleries(galleriesStore) {
			return galleriesStore.proxy("map", function (gallery) {
				var content = {
					server: gallery.server,
					id: gallery.primary,
					galleryId: gallery.id,
					secret: gallery.secret,
					farm: gallery.farm,
					title: gallery.title._content
				};
				content.url = flickrContent.createUrl(content, "z");
				return content;
			});
		};

	}

	return function GalleriesFactory($galleries) {
		Tools.mixin(new OObject, GalleriesConstructor.prototype);
		Tools.mixin(new Observable, GalleriesConstructor.prototype);
		var galleries = new GalleriesConstructor();
		galleries.setGalleries($galleries);
		return galleries;
	}

});