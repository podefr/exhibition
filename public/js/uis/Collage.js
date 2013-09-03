define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Tools = require("Tools");

	function CollageConstructor() {

		var viewModel = new Store(),
			bind = new Bind(viewModel);

		this.plugins.addAll({
			"bind": bind
		});

		this.setGallery = function setGallery(galleryStore) {
			galleryStore.watch("resetted", function (newData) {
				viewModel.reset(this.getFormattedGallery(newData));
			}, this);
		};

		this.getFormattedGallery = function getFormattedGallery(gallery) {
			return gallery.map(function (content) {
				content.url = flickrContent.createUrl(content ,"z");
				return content;
			});
		};

	}

	return function CollageFactory() {
		Tools.mixin(new OObject, CollageConstructor.prototype);
		return new CollageConstructor();
	}

});