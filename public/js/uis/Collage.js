define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Events = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Tools = require("Tools"),
		helpers = require("../adapters/helpers");

	function CollageConstructor() {

		var collageModel = new Store([]),
			slideShowModel = new Store({ display: false }),
			collage = new Bind(collageModel, helpers),
			slideShow = new Bind(slideShowModel, helpers),
			events = new Events(this);

		this.plugins.addAll({
			"collage": collage,
			"slideshow": slideShow,
			"events": events
		});

		slideShowModel.watchValue("main", function (photo) {
			var index = collageModel.proxy("indexOf", photo),
				previous = collageModel.get(index -1),
				next = collageModel.get(index +1);

			if (previous) {
				slideShowModel.set("previous", previous.url);
			}

			if (next) {
				slideShowModel.set("next", next.url);
			}

			slideShowModel.set("currentMain", index);
		});

		this.startSlideShow = function startSlideShow(ev, dom) {
			var photo = collageModel.get(collage.getItemIndex(dom));
			slideShowModel.set("main", photo.url);
			slideShowModel.set("display", true);
		};

		this.next = function next() {
			var newMainPhoto = collageModel.get(slideShowModel.get("currentMain") +1);
			if (newMainPhoto) {
				slideShowModel.set("main", newMainPhoto.url);
			}
		};

		this.previous = function previous() {
			var newMainPhoto = collageModel.get(slideShowModel.get("currentMain") -1);
			if (newMainPhoto) {
				slideShowModel.set("main", newMainPhoto.url);
			}
		};

		this.exitSlideShow = function exitSlideShow() {
			slideShowModel.set("display", false);
		};

		this.setPhotoset = function setPhotoset(photoset) {
			if (!photoset) { return false; }
			collageModel.reset(photoset.map(function (photo) {
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