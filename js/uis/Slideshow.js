var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Events = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Observable = require("emily").Observable,
    Store = require("emily").Store,
    Tools = require("emily").Tools,
    helpers = require("../adapters/helpers");

function SlideshowConstructor(provider) {

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
        } else {
        	slideShowModel.del("previous");
        }

        slideShowModel.set("hasNext", !!next);
        if (next) {
            slideShowModel.set("next", next.url);
        } else {
        	slideShowModel.del("next");
        }

        slideShowModel.set("currentMain", index);
        slideShowModel.set("current", photo.url);

    });

    slideShowModel.watchValue("main", function (photo) {
        provider.getSizes(photo.id).then(function (sizesObj) {
        	var hasVideo = getSize(sizesObj, "Video Player"),
        		hdVideo = getSize(sizesObj, "HD MP4");

        	slideShowModel.set("isVideo", !!hasVideo);
        	if (hasVideo) {
				slideShowModel.set("video", hasVideo);
        	}

        	if (hdVideo) {
        		hasVideo.width = hdVideo.width;
        		hasVideo.height = hdVideo.height;
        	}
        });
    });

    function getSize(sizesObj, desiredSize) {
    	var foundSize = null;
    	sizesObj.sizes.size.some(function (size) {
            if (size.label === desiredSize) {
            	foundSize = size;
            	return true;
            }
        });
        return foundSize;
    }

    this.displayVideoContainer = function displayVideoContainer() {
        if (slideShowModel.get("isVideo")) {
            this.notify("showVideo", slideShowModel.get("video"));
        }
    };

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

module.exports = function SlideshowFactory(dataProvider) {
    Tools.mixin(new OObject, SlideshowConstructor.prototype);
    Tools.mixin(new Observable, SlideshowConstructor.prototype);
    return new SlideshowConstructor(dataProvider);
};