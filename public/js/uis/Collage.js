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

		this.setPhotoset = function setPhotoset(photoset) {
			viewModel.reset(photoset.map(function (photo) {
				photo.url = flickrContent.createUrl(photo ,"z");
				return photo;
			}));
		};

	}

	return function CollageFactory() {
		Tools.mixin(new OObject, CollageConstructor.prototype);
		return new CollageConstructor();
	}

});