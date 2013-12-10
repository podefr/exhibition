define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Events = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools"),
		helpers = require("../adapters/helpers");

	function CollageConstructor() {

		var collageModel = new Store([]),
			collage = new Bind(collageModel, helpers),
			events = new Events(this);

		this.plugins.addAll({
			"collage": collage,
			"events": events
		});

		this.startSlideshow = function startSlideshow(ev, dom) {
			this.notify("startSlideshow", collage.getItemIndex(dom));
		};

		this.setPhotoset = function setPhotoset(photoset) {
			if (!photoset) { return false; }
			collageModel.reset(photoset.map(function (photo) {
				photo.url = flickrContent.createUrl(photo, "z");
				return photo;
			}));
		};

	}

	return function CollageFactory() {
		Tools.mixin(new OObject, CollageConstructor.prototype);
		Tools.mixin(new Observable, CollageConstructor.prototype);
		return new CollageConstructor();
	}

});