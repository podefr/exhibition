define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Events = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Tools = require("Tools"),
		helpers = require("../adapters/helpers");

	function SlideshowConstructor() {

		var slideShowModel = new Store({}),
			photosetModel = new Store([]),
			slideShow = new Bind(slideShowModel, helpers),
			events = new Events(this);

		this.plugins.addAll({
			"slideshow": slideShow,
			"events": events
		});

		slideShowModel.watchValue("main", function (photo) {
			var index = photosetModel.proxy("indexOf", photo),
				previous = photosetModel.get(index -1),
				next = photosetModel.get(index +1);

			slideShowModel.set("hasPrevious", !!previous);
			if (previous) {
				slideShowModel.set("previous", previous.url);
			}

			slideShowModel.set("hasNext", !!next);
			if (next) {
				slideShowModel.set("next", next.url);
			}

			slideShowModel.set("currentMain", index);
			slideShowModel.set("current", photo.url);

		});

		this.next = function next() {
			var newMainPhoto = photosetModel.get(slideShowModel.get("currentMain") +1);
			if (newMainPhoto) {
				slideShowModel.set("main", newMainPhoto);
			}
		};

		this.previous = function previous() {
			var newMainPhoto = photosetModel.get(slideShowModel.get("currentMain") -1);
			if (newMainPhoto) {
				slideShowModel.set("main", newMainPhoto);
			}
		};

		this.exitSlideShow = function exitSlideShow() {
			//slideShowModel.set("display", false);
		};

		this.setPhotoset = function setPhotoset(photoset) {
			if (!photoset) { return false; }
			photosetModel.reset(photoset.map(function (photo) {
				photo.url = flickrContent.createUrl(photo, "z");
				return photo;
			}));
		};

		this.setPhotoIndex = function setPhotoIndex(photoIndex) {
			var photo = photosetModel.get(photoIndex);
			if (!photo) { return false; }
			slideShowModel.set("main", photo);
		};

	}

	return function SlideshowFactory() {
		Tools.mixin(new OObject, SlideshowConstructor.prototype);
		return new SlideshowConstructor();
	}

});