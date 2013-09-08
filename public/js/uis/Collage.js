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
			this.resetViewModel(galleryStore);
			galleryStore.watch("resetted", function (newData) {
				this.resetViewModel(galleryStore);
			}, this);
		};

		this.resetViewModel = function (store) {
			viewModel.reset(this.getFormattedGallery(store));
		};

		this.getFormattedGallery = function getFormattedGallery(data) {
			return data.proxy("map", function (content) {
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