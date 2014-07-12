require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Collections = require("./uis/Collections"),
    Photosets = require("./uis/Photosets"),
    Collage = require("./uis/Collage"),
    Slideshow = require("./uis/Slideshow"),
    LocationRouter = require("olives").LocationRouter,
    Navigation = require("./uis/Navigation"),
    Stack = require("olives").Stack,
    VideoContainer = require("./uis/VideoContainer");

module.exports = function Exhibition($dataProvider) {

    var _dataProvider = $dataProvider,
        _locationRouter = new LocationRouter(),
        _collections = null,
        _photosets = null,
        _collage = null,
        _slideshow = null,
        _stack = null,
        _videoContainer = null,
        _currentPhotosetId = "",
        _currentPhotoIndex = 0,
        _photosetUpdateHandle = null,
        _slideShowUpdateHandle = null;

    this.start = function start() {
        this.initStack();
        this.initNavigation();
        this.initCollections();
        this.initPhotosets();
        this.initCollage();
        this.initSlideshow();
        this.initVideoContainer();
        _stack.hideAll();
        _locationRouter.start("home");
    };

    this.initStack = function initStack() {
        _stack = new Stack();
        _stack.place(document.querySelector(".main"));
    };

    this.initCollections = function initCollections() {
        _collections = new Collections(_dataProvider.getCollections());
        _collections.template = document.querySelector(".collections");
        _collections.render();
        _stack.add(_collections.dom);
        _collections.watch("drillin", function (id) {
        	var sets = _dataProvider.getPhotosetsForCollection(id);
        	if (sets.length > 1) {
            	_locationRouter.navigate("photosets", id);
        	} else {
        		_locationRouter.navigate("photoset", sets[0].photoset_id);
        	}
        });
    };

    this.initPhotosets = function initPhotosets() {
        _photosets = new Photosets();
        _photosets.template = document.querySelector(".photosets");
        _photosets.render();
        _stack.add(_photosets.dom);
        _photosets.watch("drillin", function (id) {
            _locationRouter.navigate("photoset", id);
        });
    };

    this.initCollage = function initcollage() {
        _collage = new Collage();
        _collage.template = document.querySelector(".collage");
        _collage.render();
        _collage.watch("startSlideshow", function (photoIndex) {
            _locationRouter.navigate("slideshow", _currentPhotosetId, photoIndex);
        });
        _stack.add(_collage.dom);
    };

    this.initSlideshow = function initSlideshow() {
        _slideshow = new Slideshow(_dataProvider);
        _slideshow.template = document.querySelector(".slideshow");
        _slideshow.render();
        _slideshow.watch("showVideo", function (video) {
        	_videoContainer.show(video);
        });
        _stack.add(_slideshow.dom);
    };

    this.initNavigation = function initNavigation() {
        _navigation = new Navigation(_locationRouter);
        _navigation.alive(document.querySelector(".navigation"));
        _navigation.watch("back", _locationRouter.back, _locationRouter);
        _navigation.watch("home", function () {
            _locationRouter.navigate("home");
        });
        _stack.add(_navigation.dom);
    };

    this.initVideoContainer = function initVideoContainer() {
    	_videoContainer = new VideoContainer(document.querySelector(".video-container"));
    };

    _locationRouter.set("home", function () {
        _stack.transit(_collections.dom);
        _stack.hide(_navigation.dom);
    });

    _locationRouter.set("photosets", function (id) {
        _photosets.setPhotosets(_dataProvider.getPhotosetsForCollection(id));
        _stack.transit(_photosets.dom);
        _stack.show(_navigation.dom);
    });

    _locationRouter.set("photoset", function (id) {
        _currentPhotosetId = id;
        _dataProvider.unsubscribeToPhotosetChanges(_photosetUpdateHandle);
        _collage.setPhotoset(_dataProvider.getPhotosFromPhotoset(id));
        _photosetUpdateHandle = _dataProvider.subscribeToPhotosetChanges(id, function (newValue) {
            _collage.setPhotoset(newValue);
        });
        _stack.transit(_collage.dom);
        _stack.show(_navigation.dom);
    });

    _locationRouter.set("slideshow", function (photosetId, photoIndex) {
        _currentPhotosetId = photosetId;
        _currentPhotoIndex = +photoIndex;
        _dataProvider.unsubscribeToPhotosetChanges(_slideShowUpdateHandle);
        _slideshow.setPhotoset(_dataProvider.getPhotosFromPhotoset(_currentPhotosetId));
        _slideshow.setPhotoIndex(_currentPhotoIndex);
        _slideShowUpdateHandle = _dataProvider.subscribeToPhotosetChanges(photosetId, function (newValue) {
            _slideshow.setPhotoset(newValue);
            _slideshow.setPhotoIndex(_currentPhotoIndex);
        });
        _stack.transit(_slideshow.dom);
        _stack.show(_navigation.dom);
    });

    _locationRouter.watch(function (route) {
        var body = document.querySelector("body");
        body.dataset.route = route;
        window.scrollTo(0, 0);
    });


};
},{"./uis/Collage":7,"./uis/Collections":8,"./uis/Navigation":9,"./uis/Photosets":10,"./uis/Slideshow":11,"./uis/VideoContainer":12,"olives":107}],2:[function(require,module,exports){
var tools = require("emily").Tools,
    Store = require("emily").Store;

module.exports = function FlickrAdapterConstructor($flickr, $apiKey, $optionalCollectionId) {

    var _flickr = $flickr || null,

    _photosets = new Store([]),

    _collections = new Store([]),

    _photos = new Store({}),

    _apiKey = $apiKey || "";

    this.requests = {
        getUserId: function getUserId(username) {
            return {
                method: "flickr.people.findByUsername",
                username: username,
                format: "json",
                api_key: _apiKey
            };
        },

        getPhotosets: function getPhotosets(userId) {
            return {
                method: "flickr.photosets.getList",
                user_id: userId,
                format: "json",
                api_key: _apiKey
            };
        },

        getCollections: function getCollections(userId) {
            var req = {
                method: "flickr.collections.getTree",
                user_id: userId,
                format: "json",
                api_key: _apiKey
            };

            if ($optionalCollectionId) {
            	req.collection_id = $optionalCollectionId;
            }

            return req;
        },

        getPhotosForPhotoset: function getPhotosForPhotoset(photosetId) {
            return {
                method: "flickr.photosets.getPhotos",
                photoset_id: photosetId,
                format: "json",
                api_key: _apiKey
            };
        },

        getSizes: function getSizes(id) {
        	return {
        		method: "flickr.photos.getSizes",
        		photo_id: id,
        		format: "json",
        		api_key: _apiKey
        	};
        }
    };

    this.setFlickr = function setFlickr(flickr) {
        _flickr = flickr;
    };

    this.getFlickr = function getFlickr() {
        return _flickr;
    };

    this.setApiKey = function setApiKey(apiKey) {
        _apiKey = apiKey;
    };

    this.getApiKey = function getApiKey() {
        return _apiKey;
    };

    this.doApiCall = function doApiCall() {
        var request = this.requests[arguments[0]].apply(null, tools.toArray(arguments).splice(1));

        return _flickr.get(request)

        .then(function assertResult(result) {
            if (result.stat == "fail") {
                console.error("Flickr API call ", request, " failed with error ", result);
                throw new Error("Flickr API call ", request, " failed with error ", result);
            }
            return result;
        });
    };

    this.init = function init(username) {
        var userId = "";

        return this.doApiCall("getUserId", username)

        .then(function setUserId(result) {
            userId = result.user.id;
        })

        .then(function getCollections() {
            return this.doApiCall("getCollections", userId);
        }, this)

        .then(function (collections) {
            _collections.reset(collections.collections.collection[0].collection);
        }, this)

        .then(function getPhotosets() {
            return this.doApiCall("getPhotosets", userId);
        }, this)

        .then(function (photoset) {
            _photosets.watch("added", this.onAddPhotoset, this);
            _photosets.reset(photoset.photosets.photoset);
        }, this);

    };

    this.onAddPhotoset = function onAddPhotoset(index, photoset) {
        this.doApiCall("getPhotosForPhotoset", photoset.id)

        .then(function (result) {
            _photos.set(photoset.id, result.photoset.photo);
        });
    };

    this.getPhotosets = function getPhotosets() {
        return _photosets.proxy("map", function (photoset) {
            return {
                server: photoset.server,
                id: photoset.primary,
                photoset_id: photoset.id,
                secret: photoset.secret,
                farm: photoset.farm,
                title: photoset.title._content
            };
        });
    };

    this.getSizes = function getSizes(id) {
    	return this.doApiCall("getSizes", id);
    };

    this.getPhotosFromPhotoset = function getPhotosFromPhotoset(photosetId) {
        return _photos.get(photosetId);
    };

    this.subscribeToPhotosetChanges = function subscribeToPhotosetChanges(id, func, scope) {
        return _photos.watchValue(id, func, scope);
    };

    this.unsubscribeToPhotosetChanges = function unsubscribeToPhotosetChanges(handle) {
        return handle && _photos.unwatchValue(handle);
    };

    this.getPhotoset = function getPhotoset(index) {
        return _photosets.get(index).map(function (photo) {
            return {
                server: photo.server,
                id: photo.primary,
                photoset_id: photo.id,
                secret: photo.secret,
                farm: photo.farm,
                title: photo.title._content
            };
        });
    };

    this.getPhotosetById = function getPhotosetById(id) {
        var returnPhotoset;

        _photosets.proxy("some", function (photoset) {
            if (photoset.id == id) {
                returnPhotoset = photoset;
                return true;
            }
        });

        return returnPhotoset;
    };

    this.getCollections = function getCollections() {
        return _collections.proxy("map", function (collection) {
            var photosetId = collection.set[0].id,
                photo = this.getPhotosetById(photosetId);
            return {
                collection_id: collection.id,
                server: photo.server,
                id: photo.primary,
                secret: photo.secret,
                farm: photo.farm,
                title: collection.title,
                description: collection.description,
                iconlarge: collection.iconlarge,
                iconesmall: collection.iconsmall
            }
        }, this);
    };

    this.getPhotosetsForCollection = function getPhotosetsForCollection(collectionId) {
        var collection;

        _collections.proxy("some", function (coll) {
            if (coll.id == collectionId) {
                collection = coll;
                return true;
            }
        })

        if (!collection) {
            return false;
        } else {
            return collection.set.map(function (photoset) {
                var photoset = this.getPhotosetById(photoset.id);
                return {
                    collection_id: collection.id,
                    photoset_id: photoset.id,
                    server: photoset.server,
                    id: photoset.primary,
                    secret: photoset.secret,
                    farm: photoset.farm,
                    title: photoset.title._content,
                }
            }, this);
        }
    };
};
},{"emily":57}],3:[function(require,module,exports){
module.exports = {

    hide: function (value) {
        if (value) {
            this.style.display = "none";
        } else {
            this.style.display = "block";
        }
    },

    show: function (value) {
        if (!value) {
            this.style.display = "none";
        } else {
            this.style.display = "block";
        }
    },

    addClass: function (value, className) {
    	if (value) {
    		this.classList.add(className);
    	} else {
    		this.classList.remove(className);
    	}
    },

    background: function (url) {
    	if (url) {
	        this.style.backgroundImage = "url(" + url + ")";
    	} else {
    		this.style.backgroundImage = "";
    	}
    }

};
},{}],"8g7Ub6":[function(require,module,exports){
var flickr = require("jsonp-flickr"),
    FlickrAdapter = require("./adapters/Flickr"),
    Exhibition = require("./Exhibition"),
    Tools = require("Emily").Tools;

module.exports = {
	init: function init(config) {

		// Init Flickr adapter
		var flickrAdapter = new FlickrAdapter(flickr, config.Flickr.api_key, config.Flickr.collection);

		// Init Exhibition
		var exhibition = new Exhibition(flickrAdapter);

		// Setup
		var contact = document.querySelector(".contact-link");
		contact.innerHTML = config.Exhibition.mail.text;
		contact.href = "mailto:" + config.Exhibition.mail.address;
		if (config.Exhibition.title) {
		    document.title = config.Exhibition.title;
		}

		Tools.toArray(document.querySelectorAll(".logo-container, .home-btn")).forEach(function (link) {
			link.href = config.Exhibition.homepage;
		});

		flickrAdapter.init(config.Flickr.username).then(function () {
		    // Start exhibition
		    exhibition.start();
		}, function (err) {
		    console.error("Failed initializing the flickr Adapter.", err)
		});

	}
};
},{"./Exhibition":1,"./adapters/Flickr":2,"Emily":34,"jsonp-flickr":59}],"exhibition":[function(require,module,exports){
module.exports=require('8g7Ub6');
},{}],6:[function(require,module,exports){
module.exports = {

    createUrl: function createUrl(content, size) {
        if (content) {
            var url = "http://farm" + content.farm +
                ".staticflickr.com/" + content.server +
                "/" + content.id +
                "_" + content.secret;

            if (size) {
                url += "_" + size;
            }

            return url + ".jpg";
        } else {
            return false;
        }
    }

};
},{}],7:[function(require,module,exports){
var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Events = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
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

module.exports = function CollageFactory() {
    Tools.mixin(new OObject, CollageConstructor.prototype);
    Tools.mixin(new Observable, CollageConstructor.prototype);
    return new CollageConstructor();
};
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":57,"olives":107}],8:[function(require,module,exports){
var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Event = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
    helpers = require("../adapters/helpers");

function CollectionsConstructor($collections) {

    var viewModel = new Store($collections.map(function (collection) {
            collection.url = flickrContent.createUrl(collection, "z");
            return collection;
        })),
        bind = new Bind(viewModel, Tools.mixin({
            getId: function (item) {
                var index = viewModel.proxy("indexOf", item) +1 +"";
                this.innerHTML = index.length == 1 ? "0" + index  : index;
            }
        }, helpers)),
        eventPlugin = new Event(this);

    this.plugins.addAll({
        "bind": bind,
        "event": eventPlugin
    });

    this.drillin = function drillin(event, dom) {
        var collection = viewModel.get(bind.getItemIndex(dom));
        this.notify("drillin", collection.collection_id);
    };

}

module.exports = function CollectionsFactory($collections) {
    Tools.mixin(new OObject, CollectionsConstructor.prototype);
    Tools.mixin(new Observable, CollectionsConstructor.prototype);
    var collections = new CollectionsConstructor($collections);
    return collections;
};
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":57,"olives":107}],9:[function(require,module,exports){
var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Events = require("olives")["Event.plugin"],
    Observable = require("emily").Observable,
    Tools = require("emily").Tools;

function NavigationConstructor() {

    var events = new Events(this);

    this.plugins.addAll({
        "events": events
    });

    this.back = function back() {
        this.notify("back");
    };

    this.home = function home() {
        this.notify("home");
    };

}

module.exports = function NavigationFactory() {
    Tools.mixin(new OObject, NavigationConstructor.prototype);
    Tools.mixin(new Observable, NavigationConstructor.prototype);
    return new NavigationConstructor();
};
},{"emily":57,"olives":107}],10:[function(require,module,exports){
var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Event = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
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

module.exports = function PhotosetsFactory() {
    Tools.mixin(new OObject, PhotosetsConstructor.prototype);
    Tools.mixin(new Observable, PhotosetsConstructor.prototype);
    return new PhotosetsConstructor();
}
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":57,"olives":107}],11:[function(require,module,exports){
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
                hdVideo = getSize(sizesObj, "HD MP4"),
                original = getSize(sizesObj, "Original");

            slideShowModel.set("isVideo", !!hasVideo);
            if (hasVideo) {
                slideShowModel.set("video", hasVideo);
            }

            slideShowModel.set("isLandscape", testIsLandscape(original));

            if (hdVideo) {
                hasVideo.width = hdVideo.width;
                hasVideo.height = hdVideo.height;
            }
        });
    });

    function testIsLandscape(size) {
        return size.width > size.height;
    }

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
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":57,"olives":107}],12:[function(require,module,exports){
module.exports = function VideoContainer(dom) {

	var videoNode = dom.querySelector("object");
	videoNode.parentElement.removeChild(videoNode);

	dom.addEventListener("click", function () {
		dom.style.display = "none";
		dom.removeChild(dom.querySelector("object"));
	}, false);

	function createVideo(url, width, height) {
		var newVideo = videoNode.cloneNode(true);
		var embed = null;

		newVideo.width = width;
		newVideo.height = height;

		newVideo.querySelector("[name=movie]").value = url;
		embed = newVideo.querySelector("embed");

		embed.width = width;
		embed.height = height;
		embed.src = url;

		embed.parentElement.style["margin-left"] = "-" + Math.floor(width / 2) + "px";
		embed.parentElement.style["margin-top"] = "-" + Math.floor(height / 2) + "px";

		return newVideo;
	}

	this.show = function show(video) {
		dom.style.display = "block";
		dom.appendChild(createVideo(video.source, video.width, video.height));
	};
};
},{}],13:[function(require,module,exports){
/**
* @license compare-numbers https://github.com/cosmosio/compare-numbers
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 */
"use strict";

/**
 * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
 * @param {Number} number1 the first number
 * @param {Number} number2 the second number
 * @returns 1 if number1>number2, -1 if number2>number1, 0 if equal
 */
function compareNumbers(number1, number2) {
      if (number1 > number2) {
        return 1;
      } else if (number1 < number2) {
        return -1;
      } else {
         return 0;
      }
}

module.exports = {

  /**
   * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
   * @param {Number} number1 the first number
   * @param {Number} number2 the second number
   * @returns 1 if number1 > number2, -1 if number2 > number1, 0 if equal
   */
    "asc": compareNumbers,

    /**
     * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
     * @param {Number} number1 the first number
     * @param {Number} number2 the second number
     * @returns 1 if number2 > number1, -1 if number1 > number2, 0 if equal
     */
    "desc": function desc(number1, number2) {
      return compareNumbers(number2, number1);
    }
};

},{}],14:[function(require,module,exports){
/**
* @license get-closest https://github.com/cosmosio/get-closest
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Get the closest number in an array
 * @param {Number} item the base number
 * @param {Array} array the array to search into
 * @param {Function} getDiff returns the difference between the base number and
 *   and the currently read item in the array. The item which returned the smallest difference wins.
 * @private
 */
function _getClosest(item, array, getDiff) {
    var closest,
        diff;

    assert(Array.isArray(array), "Get closest expects an array as second argument");

    array.forEach(function (comparedItem, comparedItemIndex) {
        var thisDiff = getDiff(comparedItem, item);

        if (thisDiff >= 0 && (typeof diff == "undefined" || thisDiff < diff)) {
            diff = thisDiff;
            closest = comparedItemIndex;
        }
    });

    return closest;
}

module.exports = {

  /**
   * Get the closest number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 3 as 29 is the closest item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  number: function closestNumber(item, array) {
      return _getClosest(item, array, function (comparedItem, item) {
          return Math.abs(comparedItem - item);
      });
  },

  /**
   * Get the closest greater number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 2 as 50 is the closest greater item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  greaterNumber: function closestGreaterNumber(item, array) {
      return _getClosest(item, array, function (comparedItem, item) {
          return comparedItem - item;
      });
  },

  /**
   * Get the closest lower number in an array given a base number
   * Example: closest(30, [20, 0, 50, 29]) will return 0 as 20 is the closest lower item
   * @param {Number} item the base number
   * @param {Array} array the array of numbers to search into
   * @returns {Number} the index of the closest item in the array
   */
  lowerNumber: function closestLowerNumber(item, array) {
    return _getClosest(item, array, function (comparedItem, item) {
        return item - comparedItem;
    });
  },

  /**
   * Get the closest item in an array given a base item and a comparator function
   * Example (closest("lundi", ["mundi", "mardi"], getLevenshteinDistance)) will return 0 for "lundi"
   * @param {*} item the base item
   * @param {Array} array an array of items
   * @param {Function} comparator a comparatof function to compare the items
   *
   * The function looks like:
   *
   * // comparedItem comes from the array
   * // baseItem is the item to compare the others to
   * // It returns a number
   * function comparator(comparedItem, baseItem) {
   *     return comparedItem - baseItem;
   * }
   */
  custom: function closestCustom(item, array, comparator) {
    return _getClosest(item, array, comparator);
  }

};

},{"assert":108}],15:[function(require,module,exports){
/**
 * @license get-global https://github.com/cosmosio/get-global
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 */
"use strict";

/**
 * Return the global object, whatever the runtime is.
 * As we're in use strict mode, we can't just call a function and return this. Instead, we spawn a new
 * function via eval that won't be affected by 'use strict'.
 * Strict mode is enforced so it allows this code to work when packed in another 'strict mode' module.
 */
module.exports = function getGlobal() {
    return Function('return this')();
};

},{}],16:[function(require,module,exports){
/**
* @license highway https://github.com/cosmosio/highway
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Observable = require("watch-notify"),
    toArray = require("to-array");

/**
 * @class
 * Routing allows for navigating in an application by defining routes.
 */
module.exports = function RouterConstructor() {

    /**
     * The routes observable (the applications use it)
     * @private
     */
    var _routes = new Observable(),

    /**
     * The events observable (used by Routing)
     * @private
     */
    _events = new Observable(),

    /**
     * The routing history
     * @private
     */
    _history = [],

    /**
     * For navigating through the history, remembers the current position
     * @private
     */
    _currentPos = -1,

    /**
     * The depth of the history
     * @private
     */
    _maxHistory = 10;

    /**
     * Only for debugging
     * @private
     */
    this.getRoutesObservable = function getRoutesObservable() {
        return _routes;
    };

    /**
     * Only for debugging
     * @private
     */
    this.getEventsObservable = function getEventsObservable() {
        return _events;
    };

    /**
     * Set the maximum length of history
     * As the user navigates through the application, the
     * routeur keeps track of the history. Set the depth of the history
     * depending on your need and the amount of memory that you can allocate it
     * @param {Number} maxHistory the depth of history
     * @returns {Boolean} true if maxHistory is equal or greater than 0
     */
    this.setMaxHistory = function setMaxHistory(maxHistory) {
        if (maxHistory >= 0) {
            _maxHistory = maxHistory;
            return true;
        } else {
            return false;
        }

    };

    /**
     * Get the current max history setting
     * @returns {Number} the depth of history
     */
    this.getMaxHistory = function getMaxHistory() {
        return _maxHistory;
    };

    /**
     * Set a new route
     * @param {String} route the name of the route
     * @param {Function} func the function to be execute when navigating to the route
     * @param {Object} scope the scope in which to execute the function
     * @returns a handle to remove the route
     */
    this.set = function set() {
        return _routes.watch.apply(_routes, arguments);
    };

    /**
     * Remove a route
     * @param {Object} handle the handle provided by the set method
     * @returns true if successfully removed
     */
    this.unset = function unset(handle) {
        return _routes.unwatch(handle);
    };

    /**
     * Navigate to a route
     * @param {String} route the route to navigate to
     * @param {*} *params
     * @returns
     */
    this.navigate = function get(route) {
        if (this.load.apply(this, arguments)) {
            // Before adding a new route to the history, we must clear the forward history
            _history.splice(_currentPos +1, _history.length);
            _history.push(toArray(arguments));
            this.ensureMaxHistory(_history);
            _currentPos = _history.length -1;
            return true;
        } else {
            return false;
        }

    };

    /**
     * Ensure that history doesn't grow bigger than the max history setting
     * @param {Store} history the history store
     * @private
     */
    this.ensureMaxHistory = function ensureMaxHistory(history) {
        var count = history.length,
            max = this.getMaxHistory(),
            excess = count - max;

        if (excess > 0) {
            history.splice(0, excess);
        }
    };

    /**
     * Actually loads the route
     * @private
     */
    this.load = function load() {
        var copy = toArray(arguments);

        if (_routes.notify.apply(_routes, copy)) {
            copy.unshift("route");
            _events.notify.apply(_events, copy);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Watch for route changes
     * @param {Function} func the func to execute when the route changes
     * @param {Object} scope the scope in which to execute the function
     * @returns {Object} the handle to unwatch for route changes
     */
    this.watch = function watch(func, scope) {
        return _events.watch("route", func, scope);
    };

    /**
     * Unwatch routes changes
     * @param {Object} handle the handle was returned by the watch function
     * @returns true if unwatch
     */
    this.unwatch = function unwatch(handle) {
        return _events.unwatch(handle);
    };

    /**
     * Get the history store, for debugging only
     * @private
     */
    this.getHistoryStore = function getHistoryStore() {
        return _history;
    };

    /**
     * Get the current length of history
     * @returns {Number} the length of history
     */
    this.getHistoryCount = function getHistoryCount() {
        return _history.length;
    };

    /**
     * Flush the entire history
     */
    this.clearHistory = function clearHistory() {
        _history.length = 0;
    };

    /**
     * Go back and forth in the history
     * @param {Number} nb the amount of history to rewind/forward
     * @returns true if history exists
     */
    this.go = function go(nb) {
        var history = _history[_currentPos + nb];
        if (history) {
            _currentPos += nb;
            this.load.apply(this, history);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Go back in the history, short for go(-1)
     * @returns
     */
    this.back = function back() {
        return this.go(-1);
    };

    /**
     * Go forward in the history, short for go(1)
     * @returns
     */
    this.forward = function forward() {
        return this.go(1);
    };

};

},{"to-array":30,"watch-notify":32}],17:[function(require,module,exports){
/**
* @license nested-property https://github.com/cosmosio/nested-property
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

module.exports = {
  set: setNestedProperty,
  get: getNestedProperty
}

/**
 * Get the property of an object nested in one or more objects
 * given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @returns the object or the the property value if found
 */
function getNestedProperty(object, property) {
    if (object && typeof object == "object") {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop) {
                return obj && obj[prop];
            }, object);
        } else if (typeof property == "number") {
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

/**
 * Set the property of an object nested in one or more objects
 * If the property doesn't exist, it gets created.
 * @param {Object} object
 * @param {String} property
 * @param value the value to set
 * @returns object if no assignment was made or the value if the assignment was made
 */
function setNestedProperty(object, property, value) {
    if (object && typeof object == "object") {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop, idx) {
                obj[prop] = obj[prop] || {};
                if (split.length == (idx + 1)) {
                    obj[prop] = value;
                }
                return obj[prop];
            }, object);
        } else if (typeof property == "number") {
            object[property] = value;
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

},{"assert":108}],18:[function(require,module,exports){
/**
* @license object-count https://github.com/cosmosio/object-count
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Count the number of properties in an object or the number or items
 * in an array.
 * It doesn't look up in the prototype chain
 * @param {Object} object the object to get the number of items/properties from
 * @returns {Number}
 */
module.exports = function count(object) {
  assert(typeof object == "object", "object must be an array or an object");

  if (Array.isArray(object)) {
    return object.length;
  } else {
    return count(Object.keys(object));
  }
};

},{"assert":108}],19:[function(require,module,exports){
/**
* @license observable-store https://github.com/flams/observable-store
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Observable = require("watch-notify"),
    diff = require("shallow-diff"),
    clone = require("shallow-copy"),
    compareNumbers = require("compare-numbers"),
    count = require("object-count"),
    nestedProperty = require("nested-property"),
    simpleLoop = require("simple-loop");

/**
 * @class
 * Store creates an observable structure based on a key/values object
 * or on an array
 * @param {Array/Object} the data to initialize the store with
 * @returns
 */
module.exports = function StoreConstructor($data) {

    /**
     * Where the data is stored
     * @private
     */
    var _data = clone($data) || {},

    /**
     * The observable for publishing changes on the store iself
     * @private
     */
    _storeObservable = new Observable(),

    /**
     * The observable for publishing changes on a value
     * @private
     */
    _valueObservable = new Observable(),

    /**
     * Saves the handles for the subscriptions of the computed properties
     * @private
     */
    _computed = [],

    /**
     * Gets the difference between two objects and notifies them
     * @private
     * @param {Object} previousData
     */
    _notifyDiffs = function _notifyDiffs(previousData) {
        var diffs = diff(previousData, _data);
        ["updated",
         "deleted",
         "added"].forEach(function (value) {
             diffs[value].forEach(function (dataIndex) {
                    _storeObservable.notify(value, dataIndex, _data[dataIndex]);
                    _valueObservable.notify(dataIndex, _data[dataIndex], value);
             });
        });
    };

   /**
    * Get the number of items in the store
    * @returns {Number} the number of items in the store
    */
    this.count = function() {
        return count(_data);
    };

    /**
     * Get a value from its index
     * @param {String} name the name of the index
     * @returns the value
     */
    this.get = function get(name) {
        return _data[name];
    };

    /**
     * Checks if the store has a given value
     * @param {String} name the name of the index
     * @returns {Boolean} true if the value exists
     */
    this.has = function has(name) {
        return _data.hasOwnProperty(name);
    };

    /**
     * Set a new value and overrides an existing one
     * @param {String} name the name of the index
     * @param value the value to assign
     * @returns true if value is set
     */
    this.set = function set(name, value) {
        var hasPrevious,
            previousValue,
            action;

        if (typeof name != "undefined") {
            hasPrevious = this.has(name);
            previousValue = this.get(name);
            _data[name] = value;
            action = hasPrevious ? "updated" : "added";
            _storeObservable.notify(action, name, _data[name], previousValue);
            _valueObservable.notify(name, _data[name], action, previousValue);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Update the property of an item.
     * @param {String} name the name of the index
     * @param {String} property the property to modify.
     * @param value the value to assign
     * @returns false if the Store has no name index
     */
    this.update = function update(name, property, value) {
        var item;
        if (this.has(name)) {
            item = this.get(name);
            nestedProperty.set(item, property, value);
            _storeObservable.notify("updated", property, value);
            _valueObservable.notify(name, item, "updated");
            return true;
        } else {
            return false;
        }
    };

    /**
     * Delete value from its index
     * @param {String} name the name of the index from which to delete the value
     * @returns true if successfully deleted.
     */
    this.del = function del(name) {
        var previous;
        if (this.has(name)) {
            if (!this.alter("splice", name, 1)) {
                previous = _data[name];
                delete _data[name];
                _storeObservable.notify("deleted", name, undefined, previous);
                _valueObservable.notify(name, _data[name], "deleted", previous);
            }
            return true;
        } else {
            return false;
        }
    };

    /**
     * Delete multiple indexes. Prefer this one over multiple del calls.
     * @param {Array}
     * @returns false if param is not an array.
     */
    this.delAll = function delAll(indexes) {
        if (Array.isArray(indexes)) {
            // Indexes must be removed from the greatest to the lowest
            // To avoid trying to remove indexes that don't exist.
            // i.e: given [0, 1, 2], remove 1, then 2, 2 doesn't exist anymore
            indexes.sort(compareNumbers.desc)
                .forEach(this.del, this);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Alter the data by calling one of it's method
     * When the modifications are done, it notifies on changes.
     * If the function called doesn't alter the data, consider using proxy instead
     * which is much, much faster.
     * @param {String} func the name of the method
     * @params {*} any number of params to be given to the func
     * @returns the result of the method call
     */
    this.alter = function alter(func) {
        var apply,
            previousData;

        if (_data[func]) {
            previousData = clone(_data);
            apply = this.proxy.apply(this, arguments);
            _notifyDiffs(previousData);
            _storeObservable.notify("altered", _data, previousData);
            return apply;
        } else {
            return false;
        }
    };

    /**
     * Proxy is similar to alter but doesn't trigger events.
     * It's preferable to call proxy for functions that don't
     * update the interal data source, like slice or filter.
     * @param {String} func the name of the method
     * @params {*} any number of params to be given to the func
     * @returns the result of the method call
     */
    this.proxy = function proxy(func) {
        if (_data[func]) {
            return _data[func].apply(_data, Array.prototype.slice.call(arguments, 1));
        } else {
            return false;
        }
    };

    /**
     * Watch the store's modifications
     * @param {String} added/updated/deleted
     * @param {Function} func the function to execute
     * @param {Object} scope the scope in which to execute the function
     * @returns {Handle} the subscribe's handler to use to stop watching
     */
    this.watch = function watch(name, func, scope) {
        return _storeObservable.watch(name, func, scope);
    };

    /**
     * Unwatch the store modifications
     * @param {Handle} handle the handler returned by the watch function
     * @returns
     */
    this.unwatch = function unwatch(handle) {
        return _storeObservable.unwatch(handle);
    };

    /**
     * Get the observable used for watching store's modifications
     * Should be used only for debugging
     * @returns {Observable} the Observable
     */
    this.getStoreObservable = function getStoreObservable() {
        return _storeObservable;
    };

    /**
     * Watch a value's modifications
     * @param {String} name the name of the value to watch for
     * @param {Function} func the function to execute
     * @param {Object} scope the scope in which to execute the function
     * @returns handler to pass to unwatchValue
     */
    this.watchValue = function watchValue(name, func, scope) {
        return _valueObservable.watch(name, func, scope);
    };

    /**
     * Unwatch the value's modifications
     * @param {Handler} handler the handler returned by the watchValue function
     * @private
     * @returns true if unwatched
     */
    this.unwatchValue = function unwatchValue(handler) {
        return _valueObservable.unwatch(handler);
    };

    /**
     * Get the observable used for watching value's modifications
     * Should be used only for debugging
     * @private
     * @returns {Observable} the Observable
     */
    this.getValueObservable = function getValueObservable() {
        return _valueObservable;
    };

    /**
     * Loop through the data
     * @param {Function} func the function to execute on each data
     * @param {Object} scope the scope in wich to run the callback
     */
    this.loop = function loop(func, scope) {
        simpleLoop(_data, func, scope);
    };

    /**
     * Reset all data and get notifications on changes
     * @param {Arra/Object} data the new data
     * @returns {Boolean}
     */
    this.reset = function reset(data) {
        if (typeof data == "object") {
            var previousData = clone(_data);
            _data = clone(data) || {};
            _notifyDiffs(previousData);
            _storeObservable.notify("resetted", _data, previousData);
            return true;
        } else {
            return false;
        }

    };

    /**
     * Compute a new property from other properties.
     * The computed property will look exactly similar to any none
     * computed property, it can be watched upon.
     * @param {String} name the name of the computed property
     * @param {Array} computeFrom a list of properties to compute from
     * @param {Function} callback the callback to compute the property
     * @param {Object} scope the scope in which to execute the callback
     * @returns {Boolean} false if wrong params given to the function
     */
    this.compute = function compute(name, computeFrom, callback, scope) {
        var args = [];

        if (typeof name == "string" &&
            typeof computeFrom == "object" &&
            typeof callback == "function" &&
            !this.isCompute(name)) {

            _computed[name] = [];

            simpleLoop(computeFrom, function (property) {
                _computed[name].push(this.watchValue(property, function () {
                    this.set(name, callback.call(scope));
                }, this));
            }, this);

            this.set(name, callback.call(scope));
            return true;
        } else {
            return false;
        }
    };

    /**
     * Remove a computed property
     * @param {String} name the name of the computed to remove
     * @returns {Boolean} true if the property is removed
     */
    this.removeCompute = function removeCompute(name) {
        if (this.isCompute(name)) {
            simpleLoop(_computed[name], function (handle) {
                this.unwatchValue(handle);
            }, this);
            this.del(name);

            delete _computed[name];
            return true;
        } else {
            return false;
        }
    };

    /**
     * Tells if a property is a computed property
     * @param {String} name the name of the property to test
     * @returns {Boolean} true if it's a computed property
     */
    this.isCompute = function isCompute(name) {
        return !!_computed[name];
    };

    /**
     * Returns a JSON version of the data
     * Use dump if you want all the data as a plain js object
     * @returns {String} the JSON
     */
    this.toJSON = function toJSON() {
        return JSON.stringify(_data);
    };

    /**
     * Returns the store's data
     * @returns {Object} the data
     */
    this.dump = function dump() {
        return _data;
    };
};

},{"compare-numbers":13,"nested-property":20,"object-count":18,"shallow-copy":22,"shallow-diff":23,"simple-loop":21,"watch-notify":32}],20:[function(require,module,exports){
/**
* @license nested-property https://github.com/cosmosio/nested-property
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

module.exports = {
  set: setNestedProperty,
  get: getNestedProperty
}

/**
 * Get the property of an object nested in one or more objects
 * given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
 * @param {Object} object the object to get the property from
 * @param {String} property the path to the property as a string
 * @returns the object or the the property value if found
 */
function getNestedProperty(object, property) {
    if (object && object instanceof Object) {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop) {
                return obj && obj[prop];
            }, object);
        } else if (typeof property == "number") {
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

/**
 * Set the property of an object nested in one or more objects
 * If the property doesn't exist, it gets created.
 * @param {Object} object
 * @param {String} property
 * @param value the value to set
 * @returns object if no assignment was made or the value if the assignment was made
 */
function setNestedProperty(object, property, value) {
    if (object && object instanceof Object) {
        if (typeof property == "string" && property !== "") {
            var split = property.split(".");
            return split.reduce(function (obj, prop, idx) {
                obj[prop] = obj[prop] || {};
                if (split.length == (idx + 1)) {
                    obj[prop] = value;
                }
                return obj[prop];
            }, object);
        } else if (typeof property == "number") {
            object[property] = value;
            return object[property];
        } else {
            return object;
        }
    } else {
        return object;
    }
}

},{"assert":108}],21:[function(require,module,exports){
/**
* @license simple-loop https://github.com/flams/simple-loop
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Small abstraction for looping over objects and arrays
 * Warning: it's not meant to be used with nodeList
 * To use with nodeList, convert to array first
 * @param {Array/Object} iterated the array or object to loop through
 * @param {Function} callback the function to execute for each iteration
 * @param {Object} scope the scope in which to execute the callback
 */
module.exports = function loop(iterated, callback, scope) {
  assert(typeof iterated == "object", "simple-loop: iterated must be an array/object");
  assert(typeof callback == "function", "simple-loop: callback must be a function");

  if (Array.isArray(iterated)) {
      iterated.forEach(callback, scope);
  } else {
      for (var i in iterated) {
          if (iterated.hasOwnProperty(i)) {
              callback.call(scope, iterated[i], i, iterated);
          }
      }
  }
};

},{"assert":108}],22:[function(require,module,exports){
module.exports = function (obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    var copy;
    
    if (isArray(obj)) {
        var len = obj.length;
        copy = Array(len);
        for (var i = 0; i < len; i++) {
            copy[i] = obj[i];
        }
    }
    else {
        var keys = objectKeys(obj);
        copy = {};
        
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i];
            copy[key] = obj[key];
        }
    }
    return copy;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) {
        if ({}.hasOwnProperty.call(obj, key)) keys.push(key);
    }
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return {}.toString.call(xs) === '[object Array]';
};

},{}],23:[function(require,module,exports){
/**
* @license shallow-diff https://github.com/cosmosio/shallow-diff
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert"),
  loop = require("simple-loop");

/**
 * Make a diff between two objects
 * @param {Array/Object} base the base object
 * @param {Array/Object} compared the object to compare the base with
 * @example:
 *  With objects:
 *
 *  base = {a:1, b:2, c:3, d:4, f:6}
 *  compared = {a:1, b:20, d: 4, e: 5}
 *  will return :
 *  {
 *      unchanged: ["a", "d"],
 *      updated: ["b"],
 *      deleted: ["f"],
 *      added: ["e"]
 *  }
 *
 * It also works with Arrays:
 *
 *  base = [10, 20, 30]
 *  compared = [15, 20]
 *  will return :
 *  {
 *      unchanged: [1],
 *      updated: [0],
 *      deleted: [2],
 *      added: []
 *  }
 *
 * @returns object
 */
module.exports = function shallowDiff(base, compared) {
  assert(typeof base == "object", "the first object to compare with shallowDiff needs to be an object");
  assert(typeof compared == "object", "the second object to compare with shallowDiff needs to be an object");

  var unchanged = [],
      updated = [],
      deleted = [],
      added = [];

   // Loop through the compared object
   loop(compared, function (value, idx) {

       // To get the added
       if (typeof base[idx] == "undefined") {
           added.push(idx);

       // The updated
     } else if (value !== base[idx]) {
           updated.push(idx);

       // And the unchanged
     } else if (value === base[idx]) {
           unchanged.push(idx);
       }

   });

   // Loop through the before object
   loop(base, function (value, idx) {

      // To get the deleted
      if (typeof compared[idx] == "undefined") {
          deleted.push(idx);
      }
   });

  return {
      updated: updated,
      unchanged: unchanged,
      added: added,
      deleted: deleted
  };
};

},{"assert":108,"simple-loop":24}],24:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],25:[function(require,module,exports){
/**
* @license simple-loop https://github.com/flams/simple-loop
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

/**
 * Small abstraction for looping over objects and arrays
 * Warning: it's not meant to be used with nodeList
 * To use with nodeList, convert to array first
 * @param {Array/Object} iterated the array or object to loop through
 * @param {Function} callback the function to execute for each iteration
 * @param {Object} scope the scope in which to execute the callback
 */
module.exports = function loop(iterated, callback, scope) {
  assert(typeof iterated == "object", "simple-loop: iterated must be an array/object");
  assert(typeof callback == "function", "simple-loop: callback must be a function");

  if (Array.isArray(iterated)) {
      for (var i=0; i<iterated.length; i++) {
          callback.call(scope, iterated[i], i, iterated);
      }
  } else {
      for (var i in iterated) {
          if (iterated.hasOwnProperty(i)) {
              callback.call(scope, iterated[i], i, iterated);
          }
      }
  }
};

},{"assert":108}],26:[function(require,module,exports){
/**
* @license simple-mixin https://github.com/flams/simple-object-mixin
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var loop = require("simple-loop");

/**
 * Mixes an object into another
 * @param {Object} source object to get values from
 * @param {Object} destination object to mix values into
 * @param {Boolean} optional, set to true to prevent overriding
 * @returns {Object} the destination object
 */
module.exports = function mixin(source, destination, dontOverride) {
    loop(source, function (value, idx) {
        if (!destination[idx] || !dontOverride) {
            destination[idx] = source[idx];
        }
    });
    return destination;
};

},{"simple-loop":27}],27:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],28:[function(require,module,exports){
/**
* @license synchronous-fsm https://github.com/flams/synchronous-fsm
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array"),
    simpleLoop = require("simple-loop");

/**
 * @class
 * Creates a stateMachine
 *
 * @param initState {String} the initial state
 * @param diagram {Object} the diagram that describes the state machine
 * @example
 *
 *      diagram = {
 *              "State1" : [
 *                      [ message1, action, nextState], // Same as the state's add function
 *                      [ message2, action2, nextState]
 *              ],
 *
 *              "State2" :
 *                       [ message3, action3, scope3, nextState]
 *                      ... and so on ....
 *
 *   }
 *
 * @return the stateMachine object
 */
module.exports = function StateMachineConstructor($initState, $diagram) {

    /**
     * The list of states
     * @private
     */
    var _states = {},

    /**
     * The current state
     * @private
     */
    _currentState = "";

    /**
     * Set the initialization state
     * @param {String} name the name of the init state
     * @returns {Boolean}
     */
    this.init = function init(name) {
            if (_states[name]) {
                _currentState = name;
                return true;
            } else {
                return false;
            }
    };

    /**
     * Add a new state
     * @private
     * @param {String} name the name of the state
     * @returns {State} a new state
     */
    this.add = function add(name) {
        if (!_states[name]) {
            var transition = _states[name] = new Transition();
            return transition;
        } else {
            return _states[name];
        }
    };

    /**
     * Get an existing state
     * @private
     * @param {String} name the name of the state
     * @returns {State} the state
     */
    this.get = function get(name) {
        return _states[name];
    };

    /**
     * Get the current state
     * @returns {String}
     */
    this.getCurrent = function getCurrent() {
        return _currentState;
    };

    /**
     * Tell if the state machine has the given state
     * @param {String} state the name of the state
     * @returns {Boolean} true if it has the given state
     */
    this.has = function has(state) {
        return _states.hasOwnProperty(state);
    };

    /**
     * Advances the state machine to a given state
     * @param {String} state the name of the state to advance the state machine to
     * @returns {Boolean} true if it has the given state
     */
    this.advance = function advance(state) {
        if (this.has(state)) {
            _currentState = state;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Pass an event to the state machine
     * @param {String} name the name of the event
     * @returns {Boolean} true if the event exists in the current state
     */
    this.event = function event(name) {
        var nextState;

        nextState = _states[_currentState].event.apply(_states[_currentState].event, toArray(arguments));
        // False means that there's no such event
        // But undefined means that the state doesn't change
        if (nextState === false) {
            return false;
        } else {
            // There could be no next state, so the current one remains
            if (nextState) {
                // Call the exit action if any
                _states[_currentState].event("exit");
                _currentState = nextState;
                // Call the new state's entry action if any
                _states[_currentState].event("entry");
            }
            return true;
        }
    };

    /**
     * Initializes the StateMachine with the given diagram
     */
    if ($diagram) {
        simpleLoop($diagram, function (transition, state) {
            var myState = this.add(state);
            transition.forEach(function (params){
                myState.add.apply(null, params);
            });
        }, this);
    }

    /**
     * Sets its initial state
     */
    this.init($initState);
};

/**
 * Each state has associated transitions
 * @constructor
 */
function Transition() {

    /**
     * The list of transitions associated to a state
     * @private
     */
    var _transitions = {};

    /**
     * Add a new transition
     * @private
     * @param {String} event the event that will trigger the transition
     * @param {Function} action the function that is executed
     * @param {Object} scope [optional] the scope in which to execute the action
     * @param {String} next [optional] the name of the state to transit to.
     * @returns {Boolean} true if success, false if the transition already exists
     */
    this.add = function add(event, action, scope, next) {

        var arr = [];

        if (_transitions[event]) {
            return false;
        }

        if (typeof event == "string" &&
            typeof action == "function") {

                arr[0] = action;

                if (typeof scope == "object") {
                    arr[1] = scope;
                }

                if (typeof scope == "string") {
                    arr[2] = scope;
                }

                if (typeof next == "string") {
                    arr[2] = next;
                }

                _transitions[event] = arr;
                return true;
        }

        return false;
    };

    /**
     * Check if a transition can be triggered with given event
     * @private
     * @param {String} event the name of the event
     * @returns {Boolean} true if exists
     */
    this.has = function has(event) {
        return !!_transitions[event];
    };

    /**
     * Get a transition from it's event
     * @private
     * @param {String} event the name of the event
     * @return the transition
     */
    this.get = function get(event) {
        return _transitions[event] || false;
    };

    /**
     * Execute the action associated to the given event
     * @param {String} event the name of the event
     * @param {params} params to pass to the action
     * @private
     * @returns false if error, the next state or undefined if success (that sounds weird)
     */
    this.event = function event(newEvent) {
        var _transition = _transitions[newEvent];
        if (_transition) {
            _transition[0].apply(_transition[1], toArray(arguments).slice(1));
            return _transition[2];
        } else {
            return false;
        }
    };
}

},{"simple-loop":29,"to-array":30}],29:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],30:[function(require,module,exports){
module.exports = toArray

function toArray(list, index) {
    var array = []

    index = index || 0

    for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i]
    }

    return array
}

},{}],31:[function(require,module,exports){
/**
* @license transport https://github.com/cosmosio/transport
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

/**
 * @class
 * Transport hides and centralizes the logic behind requests.
 * It can issue requests to request handlers, which in turn can issue requests
 * to anything your node.js server has access to (HTTP, FileSystem, SIP...)
 * @param {Emily Store} [optionanl] $reqHandlers an object containing the request handlers
 * @returns
 */
module.exports = function TransportConstructor($reqHandlers) {

    /**
     * The request handlers
     * @private
     */
    var _reqHandlers = null;

    /**
     * Set the requests handlers object
     * @param {Emily Store} reqHandlers an object containing the requests handlers
     * @returns
     */
    this.setReqHandlers = function setReqHandlers(reqHandlers) {
        if (typeof reqHandlers == "object") {
            _reqHandlers = reqHandlers;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Get the requests handlers
     * @returns{ Emily Store} reqHandlers the object containing the requests handlers
     */
    this.getReqHandlers = function getReqHandlers() {
        return _reqHandlers;
    };

    /**
     * Issue a request to a request handler
     * @param {String} reqHandler the name of the request handler to issue the request to
     * @param {Object} data the data, or payload, to send to the request handler
     * @param {Function} callback the function to execute with the result
     * @param {Object} scope the scope in which to execute the callback
     * @returns
     */
    this.request = function request(reqHandler, data, callback, scope) {
        if (_reqHandlers.has(reqHandler) &&
            typeof data != "undefined") {

            _reqHandlers.get(reqHandler)(data, function () {
                if (callback) {
                    callback.apply(scope, arguments);
                }
            });
            return true;
        } else {
            return false;
        }
    };

    /**
     * Issue a request to a reqHandler but keep listening for the response as it can be sent in several chunks
     * or remain open as long as the abort funciton is not called
     * @param {String} reqHandler the name of the request handler to issue the request to
     * @param {Object} data the data, or payload, to send to the request handler
     * @param {Function} callback the function to execute with the result
     * @param {Object} scope the scope in which to execute the callback
     * @returns {Function} the abort function to call to stop listening
     */
    this.listen = function listen(reqHandler, data, callback, scope) {
        var func,
            abort;

        if (_reqHandlers.has(reqHandler) &&
            typeof data != "undefined" &&
            typeof callback == "function") {

            func = callback.bind(scope);
            abort = _reqHandlers.get(reqHandler)(data, func, func);

            return function () {
                if (typeof abort == "function") {
                    abort();
                } else if (typeof abort == "object" && typeof abort.func == "function") {
                    abort.func.call(abort.scope);
                }
            };
        } else {
            return false;
        }
    };

    this.setReqHandlers($reqHandlers);

};

},{}],32:[function(require,module,exports){
/**
* @license watch-notify https://github.com/flams/watch-notify
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var assert = require("assert");

var loop = require("simple-loop"),
  toArray = require("to-array");

/**
* @class
* Observable is an implementation of the Observer design pattern,
* which is also known as publish/subscribe.
*
* This service creates an Observable to which you can add subscribers.
*
* @returns {Observable}
*/
module.exports = function WatchNotifyConstructor() {

    /**
     * The list of topics
     * @private
     */
    var _topics = {};

    /**
     * Add an observer
     * @param {String} topic the topic to observe
     * @param {Function} callback the callback to execute
     * @param {Object} scope the scope in which to execute the callback
     * @returns handle
     */
    this.watch = function watch(topic, callback, scope) {
        if (typeof callback == "function") {
            var observers = _topics[topic] = _topics[topic] || [],
            observer = [callback, scope];

            observers.push(observer);
            return [topic,observers.indexOf(observer)];

        } else {
            return false;
        }
    };

    /**
     * Listen to an event just once before removing the handler
     * @param {String} topic the topic to observe
     * @param {Function} callback the callback to execute
     * @param {Object} scope the scope in which to execute the callback
     * @returns handle
     */
    this.once = function once(topic, callback, scope) {
        var handle = this.watch(topic, function () {
            callback.apply(scope, arguments);
            this.unwatch(handle);
        }, this);
        return handle;
    };

    /**
     * Remove an observer
     * @param {Handle} handle returned by the watch method
     * @returns {Boolean} true if there were subscribers
     */
    this.unwatch = function unwatch(handle) {
        var topic = handle[0], idx = handle[1];
        if (_topics[topic] && _topics[topic][idx]) {
            // delete value so the indexes don't move
            delete _topics[topic][idx];
            // If the topic is only set with falsy values, delete it;
            if (!_topics[topic].some(function (value) {
                return !!value;
            })) {
                delete _topics[topic];
            }
            return true;
        } else {
            return false;
        }
    };

    /**
     * Notifies observers that a topic has a new message
     * @param {String} topic the name of the topic to publish to
     * @param subject
     * @returns {Boolean} true if there was subscribers
     */
    this.notify = function notify(topic) {
        var observers = _topics[topic],
            args = toArray(arguments).slice(1);

        if (observers) {
            loop(observers, function (value) {
                try {
                    if (value) {
                        value[0].apply(value[1] || null, args);
                    }
                } catch (err) { }
            });
            return true;
        } else {
            return false;
        }
    };

    /**
     * Check if topic has the described observer
     * @param {Handle}
     * @returns {Boolean} true if exists
     */
    this.hasObserver = function hasObserver(handle) {
        return !!( handle && _topics[handle[0]] && _topics[handle[0]][handle[1]]);
    };

    /**
     * Check if a topic has observers
     * @param {String} topic the name of the topic
     * @returns {Boolean} true if topic is listened
     */
    this.hasTopic = function hasTopic(topic) {
        return !!_topics[topic];
    };

    /**
     * Unwatch all or unwatch all from topic
     * @param {String} topic optional unwatch all from topic
     * @returns {Boolean} true if ok
     */
    this.unwatchAll = function unwatchAll(topic) {
        if (_topics[topic]) {
            delete _topics[topic];
        } else {
            _topics = {};
        }
        return true;
    };
};

},{"assert":108,"simple-loop":33,"to-array":30}],33:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],34:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
 var compareNumbers = require("compare-numbers"),
     nestedProperty = require("nested-property"),
     getClosest = require("get-closest");

module.exports = {
    Observable: require("watch-notify"),
    Promise: require("./Promise"),
    Router: require("highway"),
    StateMachine: require("synchronous-fsm"),
    Store: require("observable-store"),
    Tools: {
         getGlobal: require("get-global"),
         mixin: require("simple-object-mixin"),
         count: require("object-count"),
         compareNumbers: compareNumbers.asc,
         toArray: require("to-array"),
         loop: require("simple-loop"),
         objectsDiffs : require("shallow-diff"),
         clone: require("shallow-copy"),
         getNestedProperty: nestedProperty.get,
         setNestedProperty: nestedProperty.set,
         closest: getClosest.number,
         closestGreater: getClosest.greaterNumber,
         closestLower: getClosest.lowerNumber
     },
    Transport: require("transport")
};

},{"./Promise":35,"compare-numbers":13,"get-closest":14,"get-global":15,"highway":16,"nested-property":17,"object-count":18,"observable-store":19,"shallow-copy":22,"shallow-diff":23,"simple-loop":25,"simple-object-mixin":26,"synchronous-fsm":28,"to-array":30,"transport":31,"watch-notify":32}],35:[function(require,module,exports){
/**
* Emily.js - http://flams.github.com/emily/
* Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
* MIT Licensed
*/
"use strict";

var Observable = require("watch-notify"),
StateMachine = require("synchronous-fsm");

/**
* @class
* Create a promise/A+
*/
module.exports = function PromiseConstructor() {

    /**
     * The fulfilled value
     * @private
     */
    var _value = null,

    /**
     * The rejection reason
     * @private
     */
    _reason = null,

    /**
     * The funky observable
     * @private
     */
    _observable = new Observable(),

    /**
     * The stateMachine
     * @private
     */
    _stateMachine = new StateMachine("Pending", {

        // The promise is pending
        "Pending": [

            // It can only be fulfilled when pending
            ["fulfill", function onFulfill(value) {
                _value = value;
                _observable.notify("fulfill", value);
            // Then it transits to the fulfilled state
            }, "Fulfilled"],

            // it can only be rejected when pending
            ["reject", function onReject(reason) {
                _reason = reason;
                _observable.notify("reject", reason);
            // Then it transits to the rejected state
            }, "Rejected"],

            // When pending, add the resolver to an observable
            ["toFulfill", function toFulfill(resolver) {
                _observable.watch("fulfill", resolver);
            }],

            // When pending, add the resolver to an observable
            ["toReject", function toReject(resolver) {
                _observable.watch("reject", resolver);
            }]],

        // When fulfilled,
        "Fulfilled": [
            // We directly call the resolver with the value
            ["toFulfill", function toFulfill(resolver) {
                   resolver(_value);
            }]],

        // When rejected
        "Rejected": [
            // We directly call the resolver with the reason
            ["toReject", function toReject(resolver) {
                   resolver(_reason);
            }]]
    });

    /**
     * Fulfilled the promise.
     * A promise can be fulfilld only once.
     * @param the fulfillment value
     * @returns the promise
     */
    this.fulfill = function fulfill(value) {
        setTimeout(function () {
            _stateMachine.event("fulfill", value);
        }, 0);
        return this;

    };

    /**
     * Reject the promise.
     * A promise can be rejected only once.
     * @param the rejection value
     * @returns true if the rejection function was called
     */
    this.reject = function reject(reason) {
        setTimeout(function () {
            _stateMachine.event("reject", reason);
        }, 0);
        return this;
    };

    /**
     * The callbacks to call after fulfillment or rejection
     * @param {Function} fulfillmentCallback the first parameter is a success function, it can be followed by a scope
     * @param {Function} the second, or third parameter is the rejection callback, it can also be followed by a scope
     * @examples:
     *
     * then(fulfillment)
     * then(fulfillment, scope, rejection, scope)
     * then(fulfillment, rejection)
     * then(fulfillment, rejection, scope)
     * then(null, rejection, scope)
     * @returns {Promise} the new promise
     */
    this.then = function then() {
        var promise = new PromiseConstructor();

        // If a fulfillment callback is given
        if (arguments[0] instanceof Function) {
            // If the second argument is also a function, then no scope is given
            if (arguments[1] instanceof Function) {
                _stateMachine.event("toFulfill", this.makeResolver(promise, arguments[0]));
            } else {
                // If the second argument is not a function, it's the scope
                _stateMachine.event("toFulfill", this.makeResolver(promise, arguments[0], arguments[1]));
            }
        } else {
            // If no fulfillment callback given, give a default one
            _stateMachine.event("toFulfill", this.makeResolver(promise, function () {
                promise.fulfill(_value);
            }));
        }

        // if the second arguments is a callback, it's the rejection one, and the next argument is the scope
        if (arguments[1] instanceof Function) {
            _stateMachine.event("toReject", this.makeResolver(promise, arguments[1], arguments[2]));
        }

        // if the third arguments is a callback, it's the rejection one, and the next arguments is the sopce
        if (arguments[2] instanceof Function) {
            _stateMachine.event("toReject", this.makeResolver(promise, arguments[2], arguments[3]));
        }

        // If no rejection callback is given, give a default one
        if (!(arguments[1] instanceof Function) &&
            !(arguments[2] instanceof Function)) {
            _stateMachine.event("toReject", this.makeResolver(promise, function () {
                promise.reject(_reason);
            }));
        }

        return promise;
    };

    /**
     * Cast a thenable into an Emily promise
     * @returns {Boolean} false if the given promise is not a thenable
     */
    this.cast = function cast(thenable) {
        if (thenable instanceof PromiseConstructor ||
            typeof thenable == "object" ||
            typeof thenable == "function") {

            thenable.then(this.fulfill.bind(this),
                    this.reject.bind(this));

            return true;
        } else {
            return false;
        }
    };

    /**
     * Make a resolver
     * for debugging only
     * @private
     * @returns {Function} a closure
     */
    this.makeResolver = function makeResolver(promise, func, scope) {
        return function resolver(value) {
            var returnedPromise;

            try {
                returnedPromise = func.call(scope, value);
                if (returnedPromise === promise) {
                    throw new TypeError("Promise A+ 2.3.1: If `promise` and `x` refer to the same object, reject `promise` with a `TypeError' as the reason.");
                }
                if (!promise.cast(returnedPromise)) {
                    promise.fulfill(returnedPromise);
                }
            } catch (err) {
                promise.reject(err);
            }

        };
    };

    /**
     * Returns the reason
     * for debugging only
     * @private
     */
    this.getReason = function getReason() {
        return _reason;
    };

    /**
     * Returns the reason
     * for debugging only
     * @private
     */
    this.getValue = function getValue() {
        return _value;
    };

    /**
     * Get the promise's observable
     * for debugging only
     * @private
     * @returns {Observable}
     */
    this.getObservable = function getObservable() {
        return _observable;
    };

    /**
     * Get the promise's stateMachine
     * for debugging only
     * @private
     * @returns {StateMachine}
     */
    this.getStateMachine = function getStateMachine() {
        return _stateMachine;
    };

    /**
     * Get the statesMachine's states
     * for debugging only
     * @private
     * @returns {Object}
     */
    this.getStates = function getStates() {
        return _states;
    };
};

},{"synchronous-fsm":28,"watch-notify":32}],36:[function(require,module,exports){
module.exports=require(13)
},{}],37:[function(require,module,exports){
module.exports=require(14)
},{"assert":108}],38:[function(require,module,exports){
module.exports=require(15)
},{}],39:[function(require,module,exports){
module.exports=require(16)
},{"to-array":53,"watch-notify":55}],40:[function(require,module,exports){
module.exports=require(17)
},{"assert":108}],41:[function(require,module,exports){
module.exports=require(18)
},{"assert":108}],42:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"compare-numbers":36,"nested-property":43,"object-count":41,"shallow-copy":45,"shallow-diff":46,"simple-loop":44,"watch-notify":55}],43:[function(require,module,exports){
module.exports=require(20)
},{"assert":108}],44:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],45:[function(require,module,exports){
module.exports=require(22)
},{}],46:[function(require,module,exports){
module.exports=require(23)
},{"assert":108,"simple-loop":47}],47:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],48:[function(require,module,exports){
module.exports=require(25)
},{"assert":108}],49:[function(require,module,exports){
module.exports=require(26)
},{"simple-loop":50}],50:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],51:[function(require,module,exports){
module.exports=require(28)
},{"simple-loop":52,"to-array":53}],52:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],53:[function(require,module,exports){
module.exports=require(30)
},{}],54:[function(require,module,exports){
module.exports=require(31)
},{}],55:[function(require,module,exports){
module.exports=require(32)
},{"assert":108,"simple-loop":56,"to-array":53}],56:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],57:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"./Promise":58,"compare-numbers":36,"get-closest":37,"get-global":38,"highway":39,"nested-property":40,"object-count":41,"observable-store":42,"shallow-copy":45,"shallow-diff":46,"simple-loop":48,"simple-object-mixin":49,"synchronous-fsm":51,"to-array":53,"transport":54,"watch-notify":55}],58:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"synchronous-fsm":51,"watch-notify":55}],59:[function(require,module,exports){
/**
 * jsonp-flickr.js - https://github.com/podefr/jsonp-flickr
 * Copyright(c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

var DEFAULT_URL = "https://api.flickr.com/services/rest/";
var DEFAULT_CALLBACKNAME = "jsoncallback";

var Jsonp = require("jsonp-utils");

module.exports = new Jsonp({
	url: DEFAULT_URL,
	callbackName: DEFAULT_CALLBACKNAME
});

},{"jsonp-utils":60}],60:[function(require,module,exports){
/**
 * jsonp.js - https://github.com/podefr/jsonp
 * Copyright(c) 2013 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";var scriptUtils=require("script-utils"),uuidGenerator=require("uuid"),querystring=require("querystring"),vow=require("vow");module.exports=function Jsonp(params){params=params||{};var _timeout=params.timeout||15e3,_callbackName=params.callbackName||"callback",_url=params.url||"",_timers={};this.getTimeout=function getTimeout(){return _timeout};this.setTimeout=function setTimeout(timeout){_timeout=timeout};this.setCallbackName=function setCallbackName(callbackName){_callbackName=callbackName};this.getCallbackName=function getCallbackName(){return _callbackName};this.setUrl=function setUrl(url){_url=url};this.getUrl=function getUrl(){return _url};this.get=function get(options,callback,scope){var uuid=getUniqueId(),deferred=vow.defer(),serializedOptions=serializeOptions(addCallbackName(options,uuid)),script=scriptUtils.create(prepareUrl(_url,serializedOptions),function(){scriptUtils.remove(script)});createUniqueCallback(uuid,callback,scope,deferred);scriptUtils.append(script);startTimer(uuid,script,callback,scope,deferred);return deferred.promise()};function startTimer(uuid,script,callback,scope,deferred){_timers[uuid]=setTimeout(function(){var error=new Error("Timeout after "+_timeout+" ms");callback&&callback.call(scope,error);deferred.reject(error);delete window[uuid];scriptUtils.remove(script)},_timeout)}function clearTimer(uuid){clearTimeout(_timers[uuid])}function getUniqueId(){return"_jsonp_"+uuidGenerator.v4().replace(/-/g,"")}function addCallbackName(options,uuid){options[_callbackName]=uuid;return options}function serializeOptions(options){return querystring.stringify(options)}function prepareUrl(url,options){return url+"?"+options}function createUniqueCallback(uuid,callback,scope,deferred){window[uuid]=function(){callback&&callback.apply(scope,[null].concat([].slice.call(arguments)));deferred.resolve.apply(deferred,arguments);clearTimer(uuid);delete window[uuid]}}};
},{"querystring":114,"script-utils":61,"uuid":63,"vow":64}],61:[function(require,module,exports){
/**
 * script.js - https://github.com/podefr/script
 * Copyright(c) 2013 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";module.exports={append:function append(script){document.querySelector("head").appendChild(script)},remove:function remove(script){script.parentElement.removeChild(script)},create:function create(src,callback,scope){var script=document.createElement("script");script.src=src;script.addEventListener("load",function(){callback.apply(scope,arguments)},true);return script}};
},{}],62:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};
var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


},{}],63:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Buffer class to use
var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new BufferClass(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;
uuid.BufferClass = BufferClass;

module.exports = uuid;

},{"./rng":62,"__browserify_Buffer":110}],64:[function(require,module,exports){
var process=require("__browserify_process");/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.5
 * @license
 * Dual licensed under the MIT and GPL licenses:
 *   * http://www.opensource.org/licenses/mit-license.php
 *   * http://www.gnu.org/licenses/gpl.html
 */

(function(global) {

/**
 * @class Deferred
 * @exports vow:Deferred
 * @description
 * The `Deferred` class is used to encapsulate newly-created promise object along with functions that resolve, reject or notify it.
 */

/**
 * @constructor
 * @description
 * You can use `vow.defer()` instead of using this constructor.
 *
 * `new vow.Deferred()` gives the same result as `vow.defer()`.
 */
var Deferred = function() {
    this._promise = new Promise();
};

Deferred.prototype = /** @lends Deferred.prototype */{
    /**
     * Returns corresponding promise.
     *
     * @returns {vow:Promise}
     */
    promise : function() {
        return this._promise;
    },

    /**
     * Resolves corresponding promise with given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.then(function(value) {
     *     // value is "'success'" here
     * });
     *
     * defer.resolve('success');
     * ```
     */
    resolve : function(value) {
        this._promise.isResolved() || this._promise._resolve(value);
    },

    /**
     * Rejects corresponding promise with given `reason`.
     *
     * @param {*} reason
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.fail(function(reason) {
     *     // reason is "'something is wrong'" here
     * });
     *
     * defer.reject('something is wrong');
     * ```
     */
    reject : function(reason) {
        this._promise.isResolved() || this._promise._reject(reason);
    },

    /**
     * Notifies corresponding promise with given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.progress(function(value) {
     *     // value is "'20%'", "'40%'" here
     * });
     *
     * defer.notify('20%');
     * defer.notify('40%');
     * ```
     */
    notify : function(value) {
        this._promise.isResolved() || this._promise._notify(value);
    }
};

var PROMISE_STATUS = {
    PENDING   : 0,
    RESOLVED  : 1,
    FULFILLED : 2,
    REJECTED  : 3
};

/**
 * @class Promise
 * @exports vow:Promise
 * @description
 * The `Promise` class is used when you want to give to the caller something to subscribe to,
 * but not the ability to resolve or reject the deferred.
 */

/**
 * @constructor
 * @param {Function} resolver See https://github.com/domenic/promises-unwrapping/blob/master/README.md#the-promise-constructor for details.
 * @description
 * You should use this constructor directly only if you are going to use `vow` as DOM Promises implementation.
 * In other case you should use `vow.defer()` and `defer.promise()` methods.
 * @example
 * ```js
 * function fetchJSON(url) {
 *     return new vow.Promise(function(resolve, reject, notify) {
 *         var xhr = new XMLHttpRequest();
 *         xhr.open('GET', url);
 *         xhr.responseType = 'json';
 *         xhr.send();
 *         xhr.onload = function() {
 *             if(xhr.response) {
 *                 resolve(xhr.response);
 *             }
 *             else {
 *                 reject(new TypeError());
 *             }
 *         };
 *     });
 * }
 * ```
 */
var Promise = function(resolver) {
    this._value = undef;
    this._status = PROMISE_STATUS.PENDING;

    this._fulfilledCallbacks = [];
    this._rejectedCallbacks = [];
    this._progressCallbacks = [];

    if(resolver) { // NOTE: see https://github.com/domenic/promises-unwrapping/blob/master/README.md
        var _this = this,
            resolverFnLen = resolver.length;

        resolver(
            function(val) {
                _this.isResolved() || _this._resolve(val);
            },
            resolverFnLen > 1?
                function(reason) {
                    _this.isResolved() || _this._reject(reason);
                } :
                undef,
            resolverFnLen > 2?
                function(val) {
                    _this.isResolved() || _this._notify(val);
                } :
                undef);
    }
};

Promise.prototype = /** @lends Promise.prototype */ {
    /**
     * Returns value of fulfilled promise or reason in case of rejection.
     *
     * @returns {*}
     */
    valueOf : function() {
        return this._value;
    },

    /**
     * Returns `true` if promise is resolved.
     *
     * @returns {Boolean}
     */
    isResolved : function() {
        return this._status !== PROMISE_STATUS.PENDING;
    },

    /**
     * Returns `true` if promise is fulfilled.
     *
     * @returns {Boolean}
     */
    isFulfilled : function() {
        return this._status === PROMISE_STATUS.FULFILLED;
    },

    /**
     * Returns `true` if promise is rejected.
     *
     * @returns {Boolean}
     */
    isRejected : function() {
        return this._status === PROMISE_STATUS.REJECTED;
    },

    /**
     * Adds reactions to promise.
     *
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Function} [onProgress] Callback that will to be invoked with the value after promise has been notified
     * @param {Object} [ctx] Context of callbacks execution
     * @returns {vow:Promise} A new promise, see https://github.com/promises-aplus/promises-spec for details
     */
    then : function(onFulfilled, onRejected, onProgress, ctx) {
        var defer = new Deferred();
        this._addCallbacks(defer, onFulfilled, onRejected, onProgress, ctx);
        return defer.promise();
    },

    /**
     * Adds rejection reaction only. It is shortcut for `promise.then(undefined, onRejected)`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    'catch' : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds rejection reaction only. It is shortcut for `promise.then(null, onRejected)`. It's alias for `catch`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    fail : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds resolving reaction (to fulfillment and rejection both).
     *
     * @param {Function} onResolved Callback that to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    always : function(onResolved, ctx) {
        var _this = this,
            cb = function() {
                return onResolved.call(this, _this);
            };

        return this.then(cb, cb, ctx);
    },

    /**
     * Adds progress reaction.
     *
     * @param {Function} onProgress Callback to be called with the value when promise has been notified
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    progress : function(onProgress, ctx) {
        return this.then(undef, undef, onProgress, ctx);
    },

    /**
     * Like `promise.then`, but "spreads" the array into a variadic value handler.
     * It is useful with `vow.all` and `vow.allResolved` methods.
     *
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Object} [ctx] Context of callbacks execution
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise()]).spread(function(arg1, arg2) {
     *     // arg1 is "1", arg2 is "'two'" here
     * });
     *
     * defer1.resolve(1);
     * defer2.resolve('two');
     * ```
     */
    spread : function(onFulfilled, onRejected, ctx) {
        return this.then(
            function(val) {
                return onFulfilled.apply(this, val);
            },
            onRejected,
            ctx);
    },

    /**
     * Like `then`, but terminates a chain of promises.
     * If the promise has been rejected, throws it as an exception in a future turn of the event loop.
     *
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Function} [onProgress] Callback that will to be invoked with the value after promise has been notified
     * @param {Object} [ctx] Context of callbacks execution
     *
     * @example
     * ```js
     * var defer = vow.defer();
     * defer.reject(Error('Internal error'));
     * defer.promise().done(); // exception to be thrown
     * ```
     */
    done : function(onFulfilled, onRejected, onProgress, ctx) {
        this
            .then(onFulfilled, onRejected, onProgress, ctx)
            .fail(throwException);
    },

    /**
     * Returns a new promise that will be fulfilled in `delay` milliseconds if the promise is fulfilled,
     * or immediately rejected if promise is rejected.
     *
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(delay) {
        var timer,
            promise = this.then(function(val) {
                var defer = new Deferred();
                timer = setTimeout(
                    function() {
                        defer.resolve(val);
                    },
                    delay);

                return defer.promise();
            });

        promise.always(function() {
            clearTimeout(timer);
        });

        return promise;
    },

    /**
     * Returns a new promise that will be rejected in `timeout` milliseconds
     * if the promise is not resolved beforehand.
     *
     * @param {Number} timeout
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promiseWithTimeout1 = defer.promise().timeout(50),
     *     promiseWithTimeout2 = defer.promise().timeout(200);
     *
     * setTimeout(
     *     function() {
     *         defer.resolve('ok');
     *     },
     *     100);
     *
     * promiseWithTimeout1.fail(function(reason) {
     *     // promiseWithTimeout to be rejected in 50ms
     * });
     *
     * promiseWithTimeout2.then(function(value) {
     *     // promiseWithTimeout to be fulfilled with "'ok'" value
     * });
     * ```
     */
    timeout : function(timeout) {
        var defer = new Deferred(),
            timer = setTimeout(
                function() {
                    defer.reject(Error('timed out'));
                },
                timeout);

        this.then(
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

        defer.promise().always(function() {
            clearTimeout(timer);
        });

        return defer.promise();
    },

    _vow : true,

    _resolve : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        this._status = PROMISE_STATUS.RESOLVED;

        if(val && !!val._vow) { // shortpath for vow.Promise
            val.isFulfilled()?
                this._fulfill(val.valueOf()) :
                val.isRejected()?
                    this._reject(val.valueOf()) :
                    val.then(
                        this._fulfill,
                        this._reject,
                        this._notify,
                        this);
            return;
        }

        if(isObject(val) || isFunction(val)) {
            var then;
            try {
                then = val.then;
            }
            catch(e) {
                this._reject(e);
                return;
            }

            if(isFunction(then)) {
                var _this = this,
                    isResolved = false;

                try {
                    then.call(
                        val,
                        function(val) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._resolve(val);
                        },
                        function(err) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._reject(err);
                        },
                        function(val) {
                            _this._notify(val);
                        });
                }
                catch(e) {
                    isResolved || this._reject(e);
                }

                return;
            }
        }

        this._fulfill(val);
    },

    _fulfill : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.REJECTED;
        this._value = reason;

        this._callCallbacks(this._rejectedCallbacks, reason);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _notify : function(val) {
        this._callCallbacks(this._progressCallbacks, val);
    },

    _addCallbacks : function(defer, onFulfilled, onRejected, onProgress, ctx) {
        if(onRejected && !isFunction(onRejected)) {
            ctx = onRejected;
            onRejected = undef;
        }
        else if(onProgress && !isFunction(onProgress)) {
            ctx = onProgress;
            onProgress = undef;
        }

        var cb;

        if(!this.isRejected()) {
            cb = { defer : defer, fn : isFunction(onFulfilled)? onFulfilled : undef, ctx : ctx };
            this.isFulfilled()?
                this._callCallbacks([cb], this._value) :
                this._fulfilledCallbacks.push(cb);
        }

        if(!this.isFulfilled()) {
            cb = { defer : defer, fn : onRejected, ctx : ctx };
            this.isRejected()?
                this._callCallbacks([cb], this._value) :
                this._rejectedCallbacks.push(cb);
        }

        if(this._status <= PROMISE_STATUS.RESOLVED) {
            this._progressCallbacks.push({ defer : defer, fn : onProgress, ctx : ctx });
        }
    },

    _callCallbacks : function(callbacks, arg) {
        var len = callbacks.length;
        if(!len) {
            return;
        }

        var isResolved = this.isResolved(),
            isFulfilled = this.isFulfilled();

        nextTick(function() {
            var i = 0, cb, defer, fn;
            while(i < len) {
                cb = callbacks[i++];
                defer = cb.defer;
                fn = cb.fn;

                if(fn) {
                    var ctx = cb.ctx,
                        res;
                    try {
                        res = ctx? fn.call(ctx, arg) : fn(arg);
                    }
                    catch(e) {
                        defer.reject(e);
                        continue;
                    }

                    isResolved?
                        defer.resolve(res) :
                        defer.notify(res);
                }
                else {
                    isResolved?
                        isFulfilled?
                            defer.resolve(arg) :
                            defer.reject(arg) :
                        defer.notify(arg);
                }
            }
        });
    }
};

/** @lends Promise */
var staticMethods = {
    /**
     * Coerces given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.cast(value);
    },

    /**
     * Returns a promise to be fulfilled only after all the items in `iterable` are fulfilled,
     * or to be rejected when any of the `iterable` is rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    all : function(iterable) {
        return vow.all(iterable);
    },

    /**
     * Returns a promise to be fulfilled only when any of the items in `iterable` are fulfilled,
     * or to be rejected when the first item is rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    race : function(iterable) {
        return vow.anyResolved(iterable);
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, returned promise will be adopted with the state of given promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        return vow.resolve(value);
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        return vow.reject(reason);
    }
};

for(var prop in staticMethods) {
    staticMethods.hasOwnProperty(prop) &&
        (Promise[prop] = staticMethods[prop]);
}

var vow = /** @exports vow */ {
    Deferred : Deferred,

    Promise : Promise,

    /**
     * Creates a new deferred. This method is a factory method for `vow:Deferred` class.
     * It's equivalent to `new vow.Deferred()`.
     *
     * @returns {vow:Deferred}
     */
    defer : function() {
        return new Deferred();
    },

    /**
     * Static equivalent to `promise.then`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Function} [onProgress] Callback that will to be invoked with the value after promise has been notified
     * @param {Object} [ctx] Context of callbacks execution
     * @returns {vow:Promise}
     */
    when : function(value, onFulfilled, onRejected, onProgress, ctx) {
        return vow.cast(value).then(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.fail`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onRejected Callback that will to be invoked with the reason after promise has been rejected
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    fail : function(value, onRejected, ctx) {
        return vow.when(value, undef, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.always`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onResolved Callback that will to be invoked with the reason after promise has been resolved
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    always : function(value, onResolved, ctx) {
        return vow.when(value).always(onResolved, ctx);
    },

    /**
     * Static equivalent to `promise.progress`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onProgress Callback that will to be invoked with the reason after promise has been notified
     * @param {Object} [ctx] Context of callback execution
     * @returns {vow:Promise}
     */
    progress : function(value, onProgress, ctx) {
        return vow.when(value).progress(onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.spread`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Object} [ctx] Context of callbacks execution
     * @returns {vow:Promise}
     */
    spread : function(value, onFulfilled, onRejected, ctx) {
        return vow.when(value).spread(onFulfilled, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.done`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will to be invoked with the value after promise has been fulfilled
     * @param {Function} [onRejected] Callback that will to be invoked with the reason after promise has been rejected
     * @param {Function} [onProgress] Callback that will to be invoked with the value after promise has been notified
     * @param {Object} [ctx] Context of callbacks execution
     */
    done : function(value, onFulfilled, onRejected, onProgress, ctx) {
        vow.when(value).done(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Checks whether the given `value` is a promise-like object
     *
     * @param {*} value
     * @returns {Boolean}
     *
     * @example
     * ```js
     * vow.isPromise('something'); // returns false
     * vow.isPromise(vow.defer().promise()); // returns true
     * vow.isPromise({ then : function() { }); // returns true
     * ```
     */
    isPromise : function(value) {
        return isObject(value) && isFunction(value.then);
    },

    /**
     * Coerces given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.isPromise(value)?
            value :
            vow.resolve(value);
    },

    /**
     * Static equivalent to `promise.valueOf`.
     * If given `value` is not an instance of `vow.Promise`, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {*}
     */
    valueOf : function(value) {
        return value && isFunction(value.valueOf)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If given `value` is not an instance of `vow.Promise`, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return value && isFunction(value.isFulfilled)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If given `value` is not an instance of `vow.Promise`, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return value && isFunction(value.isRejected)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return value && isFunction(value.isResolved)? value.isResolved() : true;
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, returned promise will be adopted with the state of given promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        var res = vow.defer();
        res.resolve(value);
        return res.promise();
    },

    /**
     * Returns a promise that has already been fulfilled with the given `value`.
     * If `value` is a promise, returned promise will be fulfilled with fulfill/rejection value of given promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    fulfill : function(value) {
        var defer = vow.defer(),
            promise = defer.promise();

        defer.resolve(value);

        return promise.isFulfilled()?
            promise :
            promise.then(null, function(reason) {
                return reason;
            });
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     * If `reason` is a promise, returned promise will be rejected with fulfill/rejection value of given promise.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        if(vow.isPromise(reason)) {
            return reason.then(function(val) {
                var defer = vow.defer();
                defer.reject(val);
                return defer.promise();
            });
        }

        var defer = vow.defer();
        defer.reject(reason);
        return defer.promise();
    },

    /**
     * Invokes a given function `fn` with arguments `args`
     *
     * @param {Function} fn
     * @param {...*} [args]
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var promise1 = vow.invoke(function(value) {
     *         return value;
     *     }, 'ok'),
     *     promise2 = vow.invoke(function() {
     *         throw Error();
     *     });
     *
     * promise1.isFulfilled(); // true
     * promise1.valueOf(); // 'ok'
     * promise2.isRejected(); // true
     * promise2.valueOf(); // instance of Error
     * ```
     */
    invoke : function(fn, args) {
        var len = Math.max(arguments.length - 1, 0),
            callArgs;
        if(len) { // optimization for V8
            callArgs = Array(len);
            var i = 0;
            while(i < len) {
                callArgs[i++] = arguments[i];
            }
        }

        try {
            return vow.resolve(callArgs?
                fn.apply(global, callArgs) :
                fn.call(global));
        }
        catch(e) {
            return vow.reject(e);
        }
    },

    /**
     * Returns a promise to be fulfilled only after all the items in `iterable` are fulfilled,
     * or to be rejected when any of the `iterable` is rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * with array:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise(), 3])
     *     .then(function(value) {
     *          // value is "[1, 2, 3]" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     *
     * @example
     * with object:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all({ p1 : defer1.promise(), p2 : defer2.promise(), p3 : 3 })
     *     .then(function(value) {
     *          // value is "{ p1 : 1, p2 : 2, p3 : 3 }" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     */
    all : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            len = keys.length,
            res = isPromisesArray? [] : {};

        if(!len) {
            defer.resolve(res);
            return defer.promise();
        }

        var i = len;
        vow._forEach(
            iterable,
            function() {
                if(!--i) {
                    var j = 0;
                    while(j < len) {
                        res[keys[j]] = vow.valueOf(iterable[keys[j++]]);
                    }
                    defer.resolve(res);
                }
            },
            defer.reject,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    /**
     * Returns a promise to be fulfilled only after all the items in `iterable` are resolved.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.allResolved([defer1.promise(), defer2.promise()]).spread(function(promise1, promise2) {
     *     promise1.isRejected(); // returns true
     *     promise1.valueOf(); // returns "'error'"
     *     promise2.isFulfilled(); // returns true
     *     promise2.valueOf(); // returns "'ok'"
     * });
     *
     * defer1.reject('error');
     * defer2.resolve('ok');
     * ```
     */
    allResolved : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            i = keys.length,
            res = isPromisesArray? [] : {};

        if(!i) {
            defer.resolve(res);
            return defer.promise();
        }

        var onResolved = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(
            iterable,
            onResolved,
            onResolved,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    allPatiently : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                rejectedPromises, fulfilledPromises,
                len = keys.length, i = 0, key, promise;

            if(!len) {
                return isPromisesArray? [] : {};
            }

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                if(vow.isRejected(promise)) {
                    rejectedPromises || (rejectedPromises = isPromisesArray? [] : {});
                    isPromisesArray?
                        rejectedPromises.push(promise.valueOf()) :
                        rejectedPromises[key] = promise.valueOf();
                }
                else if(!rejectedPromises) {
                    (fulfilledPromises || (fulfilledPromises = isPromisesArray? [] : {}))[key] = vow.valueOf(promise);
                }
            }

            if(rejectedPromises) {
                throw rejectedPromises;
            }

            return fulfilledPromises;
        });
    },

    /**
     * Returns a promise to be fulfilled only when any of the items in `iterable` are fulfilled,
     * or to be rejected when all the items are rejected (with the reason of the first rejected item).
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    any : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        var i = 0, reason;
        vow._forEach(
            iterable,
            defer.resolve,
            function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            },
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Returns a promise to be fulfilled only when any of the items in `iterable` are fulfilled,
     * or to be rejected when the first item is rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    anyResolved : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        vow._forEach(
            iterable,
            defer.resolve,
            defer.reject,
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Static equivalent to `promise.delay`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(value, delay) {
        return vow.resolve(value).delay(delay);
    },

    /**
     * Static equivalent to `promise.timeout`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @param {Number} timeout
     * @returns {vow:Promise}
     */
    timeout : function(value, timeout) {
        return vow.resolve(value).timeout(timeout);
    },

    _forEach : function(promises, onFulfilled, onRejected, onProgress, ctx, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;
        while(i < len) {
            vow.when(promises[keys? keys[i] : i], onFulfilled, onRejected, onProgress, ctx);
            ++i;
        }
    }
};

var undef,
    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                return fns.push(fn) === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof setImmediate === 'function') { // ie10, nodejs >= 0.10
            return function(fn) {
                enqueueFn(fn) && setImmediate(callFns);
            };
        }

        if(typeof process === 'object' && process.nextTick) { // nodejs < 0.10
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(global.postMessage) { // modern browsers
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__promise' + +new Date,
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                };
                (doc.documentElement || doc.body).appendChild(script);
            };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })(),
    throwException = function(e) {
        nextTick(function() {
            throw e;
        });
    },
    isFunction = function(obj) {
        return typeof obj === 'function';
    },
    isObject = function(obj) {
        return obj !== null && typeof obj === 'object';
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    getArrayKeys = function(arr) {
        var res = [],
            i = 0, len = arr.length;
        while(i < len) {
            res.push(i++);
        }
        return res;
    },
    getObjectKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            obj.hasOwnProperty(i) && res.push(i);
        }
        return res;
    };

var defineAsGlobal = true;
if(typeof exports === 'object') {
    module.exports = vow;
    defineAsGlobal = false;
}

if(typeof modules === 'object') {
    modules.define('vow', function(provide) {
        provide(vow);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = vow;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.vow = vow);

})(this);

},{"__browserify_process":111}],65:[function(require,module,exports){
/**
* @license data-binding-plugin https://github.com/flams/data-binding-plugin
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Observable = require("watch-notify"),
    compareNumbers = require("compare-numbers"),
    simpleLoop = require("simple-loop"),
    toArray = require("to-array"),
    getClosest = require("get-closest"),
    nestedProperty = require("nested-property"),
    getNodes = require("get-nodes"),
    getDataset =  require("get-dataset");

function setAttribute(node, property, value) {
    if ('ownerSVGElement' in node) {
        node.setAttribute(property, value);
        return true;
    } else if ('ownerDocument' in node) {
        node[property] = value;
        return true;
    } else {
        throw new Error("invalid element type");
    }
}

/**
 * @class
 * This plugin links dom nodes to a model
 */
module.exports = function BindPluginConstructor($model, $bindings) {

    /**
     * The model to watch
     * @private
     */
    var _model = null,

    /**
     * The list of custom bindings
     * @private
     */
    _bindings = {},

    /**
     * The list of itemRenderers
     * each foreach has its itemRenderer
     * @private
     */
    _itemRenderers = {},

    /**
     * The observers handlers
     * @private
     */
    _observers = {};

    /**
     * Exposed for debugging purpose
     * @private
     */
    this.observers = _observers;

    function _removeObserversForId(id) {
        if (_observers[id]) {
            _observers[id].forEach(function (handler) {
                _model.unwatchValue(handler);
            });
            delete _observers[id];
        }
    }

    /**
     * Define the model to watch for
     * @param {Store} model the model to watch for changes
     * @returns {Boolean} true if the model was set
     */
    this.setModel = function setModel(model) {
        _model = model;
    };

    /**
     * Get the store that is watched for
     * for debugging only
     * @private
     * @returns the Store
     */
    this.getModel = function getModel() {
        return _model;
    };

    /**
     * The item renderer defines a dom node that can be duplicated
     * It is made available for debugging purpose, don't use it
     * @private
     */
    this.ItemRenderer = function ItemRenderer($plugins, $rootNode) {

        /**
         * The node that will be cloned
         * @private
         */
        var _node = null,

        /**
         * The object that contains plugins.name and plugins.apply
         * @private
         */
        _plugins = null,

        /**
         * The _rootNode where to append the created items
         * @private
         */
        _rootNode = null,

        /**
         * The lower boundary
         * @private
         */
        _start = null,

        /**
         * The number of item to display
         * @private
         */
        _nb = null;

        /**
         * Set the duplicated node
         * @private
         */
        this.setRenderer = function setRenderer(node) {
            _node = node;
            return true;
        };

        /**
         * Returns the node that is going to be used for rendering
         * @private
         * @returns the node that is duplicated
         */
        this.getRenderer = function getRenderer() {
            return _node;
        };

        /**
         * Sets the rootNode and gets the node to copy
         * @private
         * @param {HTMLElement|SVGElement} rootNode
         * @returns
         */
        this.setRootNode = function setRootNode(rootNode) {
            var renderer;
            _rootNode = rootNode;
            renderer = _rootNode.querySelector("*");
            this.setRenderer(renderer);
            if (renderer) {
                _rootNode.removeChild(renderer);
            }
        };

        /**
         * Gets the rootNode
         * @private
         * @returns _rootNode
         */
        this.getRootNode = function getRootNode() {
            return _rootNode;
        };

        /**
         * Set the plugins objet that contains the name and the apply function
         * @private
         * @param plugins
         * @returns true
         */
        this.setPlugins = function setPlugins(plugins) {
            _plugins = plugins;
            return true;
        };

        /**
         * Get the plugins object
         * @private
         * @returns the plugins object
         */
        this.getPlugins = function getPlugins() {
            return _plugins;
        };

        /**
         * The nodes created from the items are stored here
         * @private
         */
        this.items = {};

        /**
         * Set the start limit
         * @private
         * @param {Number} start the value to start rendering the items from
         * @returns the value
         */
        this.setStart = function setStart(start) {
            _start = parseInt(start, 10);
            return _start;
        };

        /**
         * Get the start value
         * @private
         * @returns the start value
         */
        this.getStart = function getStart() {
            return _start;
        };

        /**
         * Set the number of item to display
         * @private
         * @param {Number/String} nb the number of item to display or "*" for all
         * @returns the value
         */
        this.setNb = function setNb(nb) {
            _nb = nb == "*" ? nb : parseInt(nb, 10);
            return _nb;
        };

        /**
         * Get the number of item to display
         * @private
         * @returns the value
         */
        this.getNb = function getNb() {
            return _nb;
        };

        /**
         * Adds a new item and adds it in the items list
         * @private
         * @param {Number} id the id of the item
         * @returns
         */
        this.addItem = function addItem(id) {
            var node,
                next;

            if (typeof id == "number" && !this.items[id]) {
                next = this.getNextItem(id);
                node = this.create(id);
                if (node) {
                    // IE (until 9) apparently fails to appendChild when insertBefore's second argument is null, hence this.
                    if (next) {
                        _rootNode.insertBefore(node, next);
                    } else {
                        _rootNode.appendChild(node);
                    }
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        };

        /**
         * Get the next item in the item store given an id.
         * @private
         * @param {Number} id the id to start from
         * @returns
         */
        this.getNextItem = function getNextItem(id) {
            var keys = Object.keys(this.items).map(function (string) {
                    return Number(string);
                }),
                closest = getClosest.greaterNumber(id, keys),
                closestId = keys[closest];

            // Only return if different
            if (closestId != id) {
                return this.items[closestId];
            } else {
                return;
            }
        };

        /**
         * Remove an item from the dom and the items list
         * @private
         * @param {Number} id the id of the item to remove
         * @returns
         */
        this.removeItem = function removeItem(id) {
            var item = this.items[id];
            if (item) {
                _rootNode.removeChild(item);
                delete this.items[id];
                _removeObserversForId(id);
                return true;
            } else {
                return false;
            }
        };

        /**
         * create a new node. Actually makes a clone of the initial one
         * and adds pluginname_id to each node, then calls plugins.apply to apply all plugins
         * @private
         * @param id
         * @param pluginName
         * @returns the associated node
         */
        this.create = function create(id) {
            if (_model.has(id)) {
                var newNode = _node.cloneNode(true),
                nodes = getNodes(newNode);

                toArray(nodes).forEach(function (child) {
                    child.setAttribute("data-" + _plugins.name+"_id", id);
                });

                this.items[id] = newNode;
                _plugins.apply(newNode);
                return newNode;
            }
        };

        /**
         * Renders the dom tree, adds nodes that are in the boundaries
         * and removes the others
         * @private
         * @returns true boundaries are set
         */
        this.render = function render() {
            // If the number of items to render is all (*)
            // Then get the number of items
            var _tmpNb = _nb == "*" ? _model.count() : _nb;

            // This will store the items to remove
            var marked = [];

            // Render only if boundaries have been set
            if (_nb !== null && _start !== null) {

                // Loop through the existing items
                simpleLoop(this.items, function (value, idx) {
                    // If an item is out of the boundary
                    idx = Number(idx);

                    if (idx < _start || idx >= (_start + _tmpNb) || !_model.has(idx)) {
                        // Mark it
                        marked.push(idx);
                    }
                }, this);

                // Remove the marked item from the highest id to the lowest
                // Doing this will avoid the id change during removal
                // (removing id 2 will make id 3 becoming 2)
                marked.sort(compareNumbers.desc).forEach(this.removeItem, this);

                // Now that we have removed the old nodes
                // Add the missing one
                for (var i=_start, l=_tmpNb+_start; i<l; i++) {
                    this.addItem(i);
                }
                return true;
            } else {
                return false;
            }
        };

        if ($plugins) {
            this.setPlugins($plugins);
        }
        if ($rootNode) {
            this.setRootNode($rootNode);
        }
    };

    /**
     * Save an itemRenderer according to its id
     * @private
     * @param {String} id the id of the itemRenderer
     * @param {ItemRenderer} itemRenderer an itemRenderer object
     */
    this.setItemRenderer = function setItemRenderer(id, itemRenderer) {
        id = id || "default";
        _itemRenderers[id] = itemRenderer;
    };

    /**
     * Get an itemRenderer
     * @private
     * @param {String} id the name of the itemRenderer
     * @returns the itemRenderer
     */
    this.getItemRenderer = function getItemRenderer(id) {
        return _itemRenderers[id];
    };

    /**
     * Expands the inner dom nodes of a given dom node, filling it with model's values
     * @param {HTMLElement|SVGElement} node the dom node to apply foreach to
     */
    this.foreach = function foreach(node, idItemRenderer, start, nb) {
        var itemRenderer = new this.ItemRenderer(this.plugins, node);

        itemRenderer.setStart(start || 0);
        itemRenderer.setNb(nb || "*");

        itemRenderer.render();

        // Add the newly created item
        _model.watch("added", itemRenderer.render, itemRenderer);

        // If an item is deleted
        _model.watch("deleted", function (idx) {
            itemRenderer.render();
            // Also remove all observers
            _removeObserversForId(idx);
        },this);

        this.setItemRenderer(idItemRenderer, itemRenderer);
     };

     /**
      * Update the lower boundary of a foreach
      * @param {String} id the id of the foreach to update
      * @param {Number} start the new value
      * @returns true if the foreach exists
      */
     this.updateStart = function updateStart(id, start) {
         var itemRenderer = this.getItemRenderer(id);
         if (itemRenderer) {
             itemRenderer.setStart(start);
             return true;
         } else {
             return false;
         }
     };

     /**
      * Update the number of item to display in a foreach
      * @param {String} id the id of the foreach to update
      * @param {Number} nb the number of items to display
      * @returns true if the foreach exists
      */
     this.updateNb = function updateNb(id, nb) {
         var itemRenderer = this.getItemRenderer(id);
         if (itemRenderer) {
             itemRenderer.setNb(nb);
             return true;
         } else {
             return false;
         }
     };

     /**
      * Refresh a foreach after having modified its limits
      * @param {String} id the id of the foreach to refresh
      * @returns true if the foreach exists
      */
     this.refresh = function refresh(id) {
        var itemRenderer = this.getItemRenderer(id);
        if (itemRenderer) {
            itemRenderer.render();
            return true;
        } else {
            return false;
        }
     };

    /**
     * Both ways binding between a dom node attributes and the model
     * @param {HTMLElement|SVGElement} node the dom node to apply the plugin to
     * @param {String} name the name of the property to look for in the model's value
     * @returns
     */
    this.bind = function bind(node, property, name) {

        // Name can be unset if the value of a row is plain text
        name = name || "";

        // In case of an array-like model the id is the index of the model's item to look for.
        // The _id is added by the foreach function
        var id = node.getAttribute("data-" + this.plugins.name+"_id"),

        // Else, it is the first element of the following
        split = name.split("."),

        // So the index of the model is either id or the first element of split
        modelIdx = id || split.shift(),

        // And the name of the property to look for in the value is
        prop = id ? name : split.join("."),

        // Get the model's value
        get = nestedProperty.get(_model.get(modelIdx), prop),

        // When calling bind like bind:newBinding,param1, param2... we need to get them
        extraParam = toArray(arguments).slice(3);

        // 0 and false are acceptable falsy values
        if (get || get === 0 || get === false) {
            // If the binding hasn't been overriden
            if (!this.execBinding.apply(this,
                    [node, property, get]
                // Extra params are passed to the new binding too
                    .concat(extraParam))) {
                // Execute the default one which is a simple assignation
                //node[property] = get;
                setAttribute(node, property, get);
            }
        }

        // Only watch for changes (double way data binding) if the binding
        // has not been redefined
        if (!this.hasBinding(property)) {
            node.addEventListener("change", function (event) {
                if (_model.has(modelIdx)) {
                    if (prop) {
                        _model.update(modelIdx, name, node[property]);
                    } else {
                        _model.set(modelIdx, node[property]);
                    }
                }
            }, true);

        }

        // Watch for changes
        this.observers[modelIdx] = this.observers[modelIdx] || [];
        this.observers[modelIdx].push(_model.watchValue(modelIdx, function (value) {
            if (!this.execBinding.apply(this,
                    [node, property, nestedProperty.get(value, prop)]
                    // passing extra params too
                    .concat(extraParam))) {

                setAttribute(node, property, nestedProperty.get(value, prop));
            }
        }, this));

    };

    /**
     * Set the node's value into the model, the name is the model's property
     * @private
     * @param {HTMLElement|SVGElement} node
     * @returns true if the property is added
     */
    this.set = function set(node) {
        if (node.name) {
            _model.set(node.name, node.value);
            return true;
        } else {
            return false;
        }
    };

    this.getItemIndex = function getElementId(dom) {
        var dataset = getDataset(dom);

        if (dataset && typeof dataset[this.plugins.name + "_id"] != "undefined") {
            return +dataset[this.plugins.name + "_id"];
        } else {
            return false;
        }
    };

    /**
     * Prevents the submit and set the model with all form's inputs
     * @param {HTMLFormElement} DOMfrom
     * @returns true if valid form
     */
    this.form = function form(DOMform) {
        if (DOMform && DOMform.nodeName == "FORM") {
            var that = this;
            DOMform.addEventListener("submit", function (event) {
                toArray(DOMform.querySelectorAll("[name]")).forEach(that.set, that);
                event.preventDefault();
            }, true);
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add a new way to handle a binding
     * @param {String} name of the binding
     * @param {Function} binding the function to handle the binding
     * @returns
     */
    this.addBinding = function addBinding(name, binding) {
        if (name && typeof name == "string" && typeof binding == "function") {
            _bindings[name] = binding;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Execute a binding
     * Only used by the plugin
     * @private
     * @param {HTMLElement} node the dom node on which to execute the binding
     * @param {String} name the name of the binding
     * @param {Any type} value the value to pass to the function
     * @returns
     */
    this.execBinding = function execBinding(node, name) {
        if (this.hasBinding(name)) {
            _bindings[name].apply(node, Array.prototype.slice.call(arguments, 2));
            return true;
        } else {
            return false;
        }
    };

    /**
     * Check if the binding exists
     * @private
     * @param {String} name the name of the binding
     * @returns
     */
    this.hasBinding = function hasBinding(name) {
        return _bindings.hasOwnProperty(name);
    };

    /**
     * Get a binding
     * For debugging only
     * @private
     * @param {String} name the name of the binding
     * @returns
     */
    this.getBinding = function getBinding(name) {
        return _bindings[name];
    };

    /**
     * Add multiple binding at once
     * @param {Object} list the list of bindings to add
     * @returns
     */
    this.addBindings = function addBindings(list) {
        return simpleLoop(list, function (binding, name) {
            this.addBinding(name, binding);
        }, this);
    };

    // Inits the model
    this.setModel($model);
    // Inits bindings

    if ($bindings) {
        this.addBindings($bindings);
    }
};

},{"compare-numbers":66,"get-closest":67,"get-dataset":68,"get-nodes":69,"nested-property":70,"simple-loop":71,"to-array":72,"watch-notify":73}],66:[function(require,module,exports){
module.exports=require(13)
},{}],67:[function(require,module,exports){
module.exports=require(14)
},{"assert":108}],68:[function(require,module,exports){
/**
* @license get-dataset https://github.com/cosmios/get-dataset
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

/**
 * Get a domNode's dataset attribute. If dataset doesn't exist (IE)
 * then the domNode is looped through to collect them.
 * @param {HTMLElement|SVGElement} dom
 * @returns {Object} dataset
 */
 module.exports = function getDataset(dom) {
    var dataset = {},
        i, l, split,join;

    if ("dataset" in dom) {
        return dom.dataset;
    } else {
        for (i=0, l=dom.attributes.length; i<l; i++) {
            split = dom.attributes[i].name.split("-");
            if (split.shift() == "data") {
                dataset[join = split.join("-")] = dom.getAttribute("data-"+join);
            }
        }
        return dataset;
    }
};

},{}],69:[function(require,module,exports){
/**
* @license get-nodes https://github.com/cosmios/get-nodes
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array");

module.exports = function getNodes(dom) {
    var domElements = dom.querySelectorAll("*"),
        arrayDomElements = toArray(domElements);

    arrayDomElements.unshift(dom);

    return arrayDomElements;
};

},{"to-array":72}],70:[function(require,module,exports){
module.exports=require(17)
},{"assert":108}],71:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],72:[function(require,module,exports){
module.exports=require(30)
},{}],73:[function(require,module,exports){
module.exports=require(32)
},{"assert":108,"simple-loop":71,"to-array":72}],74:[function(require,module,exports){
/**
* @license dom-stack https://github.com/cosmosio/dom-stack
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array");

/**
 * @class
 * A Stack is a tool for managing DOM elements as groups. Within a group, dom elements
 * can be added, removed, moved around. The group can be moved to another parent node
 * while keeping the DOM elements in the same order, excluding the parent dom elements's
 * children that are not in the Stack.
 */
module.exports = function StackConstructor($parent) {

	/**
	 * The parent DOM element is a documentFragment by default
	 * @private
	 */
	var _parent = document.createDocumentFragment(),

	/**
	 * The place where the dom elements hide
	 * @private
	 */
	_hidePlace = document.createElement("div"),

	/**
	 * The list of dom elements that are part of the stack
	 * Helps for excluding elements that are not part of it
	 * @private
	 */
	_childNodes = [],

	_lastTransit = null;

	/**
	 * Add a DOM element to the stack. It will be appended.
	 * @param {HTMLElement} dom the DOM element to add
	 * @returns {HTMLElement} dom
	 */
	this.add = function add(dom) {
		if (!this.has(dom)) {
			_parent.appendChild(dom);
			_childNodes.push(dom);
			return dom;
		} else {
			return false;
		}
	};

	/**
	 * Remove a DOM element from the stack.
	 * @param {HTMLElement} dom the DOM element to remove
	 * @returns {HTMLElement} dom
	 */
	this.remove = function remove(dom) {
		var index;
		if (this.has(dom)) {
			index = _childNodes.indexOf(dom);
			_parent.removeChild(dom);
			_childNodes.splice(index, 1);
			return dom;
		} else {
			return false;
		}
	};

	/**
	 * Place a stack by appending its DOM elements to a new parent
	 * @param {HTMLElement} newParentDom the new DOM element to append the stack to
	 * @returns {HTMLElement} newParentDom
	 */
	this.place = function place(newParentDom) {
		[].slice.call(_parent.childNodes).forEach(function (childDom) {
			if (this.has(childDom)) {
				newParentDom.appendChild(childDom);
			}
		}, this);
		return this._setParent(newParentDom);
	};

	/**
	 * Move an element up in the stack
	 * @param {HTMLElement} dom the dom element to move up
	 * @returns {HTMLElement} dom
	 */
	this.up = function up(dom) {
		if (this.has(dom)) {
			var domPosition = this.getPosition(dom);
			this.move(dom, domPosition + 1);
			return dom;
		} else {
			return false;
		}
	};

	/**
	 * Move an element down in the stack
	 * @param {HTMLElement} dom the dom element to move down
	 * @returns {HTMLElement} dom
	 */
	this.down = function down(dom) {
		if (this.has(dom)) {
			var domPosition = this.getPosition(dom);
			this.move(dom, domPosition - 1);
			return dom;
		} else {
			return false;
		}
	};

	/**
	 * Move an element that is already in the stack to a new position
	 * @param {HTMLElement} dom the dom element to move
	 * @param {Number} position the position to which to move the DOM element
	 * @returns {HTMLElement} dom
	 */
	this.move = function move(dom, position) {
		if (this.has(dom)) {
			var domIndex = _childNodes.indexOf(dom);
			_childNodes.splice(domIndex, 1);
			// Preventing a bug in IE when insertBefore is not given a valid
			// second argument
			var nextElement = getNextElementInDom(position);
			if (nextElement) {
				_parent.insertBefore(dom, nextElement);
			} else {
				_parent.appendChild(dom);
			}
			_childNodes.splice(position, 0, dom);
			return dom;
		} else {
			return false;
		}
	};

	function getNextElementInDom(position) {
		if (position >= _childNodes.length) {
			return;
		}
		var nextElement = _childNodes[position];
		if (toArray(_parent.childNodes).indexOf(nextElement) == -1) {
			return getNextElementInDom(position +1);
		} else {
			return nextElement;
		}
	}

	/**
	 * Insert a new element at a specific position in the stack
	 * @param {HTMLElement} dom the dom element to insert
	 * @param {Number} position the position to which to insert the DOM element
	 * @returns {HTMLElement} dom
	 */
	this.insert = function insert(dom, position) {
		if (!this.has(dom)) {
			_childNodes.splice(position, 0, dom);
			_parent.insertBefore(dom, _parent.childNodes[position]);
			return dom;
		} else {
			return false;
		}
	};

	/**
	 * Get the position of an element in the stack
	 * @param {HTMLElement} dom the dom to get the position from
	 * @returns {HTMLElement} dom
	 */
	this.getPosition = function getPosition(dom) {
		return _childNodes.indexOf(dom);
	};

	/**
	 * Count the number of elements in a stack
	 * @returns {Number} the number of items
	 */
	this.count = function count() {
		return _parent.childNodes.length;
	};

	/**
	 * Tells if a DOM element is in the stack
	 * @param {HTMLElement} dom the dom to tell if its in the stack
	 * @returns {HTMLElement} dom
	 */
	this.has = function has(childDom) {
		return this.getPosition(childDom) >= 0;
	};

	/**
	 * Hide a dom element that was previously added to the stack
	 * It will be taken out of the dom until displayed again
	 * @param {HTMLElement} dom the dom to hide
	 * @return {boolean} if dom element is in the stack
	 */
	this.hide = function hide(dom) {
		if (this.has(dom)) {
			_hidePlace.appendChild(dom);
			return true;
		} else {
			return false;
		}
	};

	/**
	 * Show a dom element that was previously hidden
	 * It will be added back to the dom
	 * @param {HTMLElement} dom the dom to show
	 * @return {boolean} if dom element is current hidden
	 */
	this.show = function show(dom) {
		if (this.has(dom) && dom.parentNode === _hidePlace) {
			this.move(dom, _childNodes.indexOf(dom));
			return true;
		} else {
			return false;
		}
	};

	/**
	 * Helper function for hiding all the dom elements
	 */
	this.hideAll = function hideAll() {
		_childNodes.forEach(this.hide, this);
	};

	/**
	 * Helper function for showing all the dom elements
	 */
	this.showAll = function showAll() {
		_childNodes.forEach(this.show, this);
	};

	/**
	 * Get the parent node that a stack is currently attached to
	 * @returns {HTMLElement} parent node
	 */
	this.getParent = function getParent() {
		return _parent;
	};

	/**
	 * Set the parent element (without appending the stacks dom elements to)
	 * @private
	 */
	this._setParent = function _setParent(parent) {
		_parent = parent;
		return _parent;
    };

	/**
	 * Get the place where the DOM elements are hidden
	 * @private
	 */
	this.getHidePlace = function getHidePlace() {
		return _hidePlace;
	};

	/**
	 * Set the place where the DOM elements are hidden
	 * @private
	 */
	this.setHidePlace = function setHidePlace(hidePlace) {
		_hidePlace = hidePlace;
	};

	/**
	 * Get the last dom element that the stack transitted to
	 * @returns {HTMLElement} the last dom element
	 */
	this.getLastTransit = function getLastTransit() {
		return _lastTransit;
	};

	/**
	 * Transit between views, will show the new one and hide the previous
	 * element that the stack transitted to, if any.
	 * @param {HTMLElement} dom the element to transit to
	 * @returns {Boolean} false if the element can't be shown
	 */
	this.transit = function transit(dom) {
		if (_lastTransit) {
			this.hide(_lastTransit);
		}
		if (this.show(dom)) {
			_lastTransit = dom;
			return true;
		} else {
			return false;
		}
	};

    if ($parent) {
	    this._setParent($parent);
    }

};

},{"to-array":75}],75:[function(require,module,exports){
module.exports=require(30)
},{}],76:[function(require,module,exports){
/**
* @license event-plugin https://github.com/flams/event-plugin
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
*/
"use strict";

/**
* @class
* @requires Utils
* Event plugin adds events listeners to DOM nodes.
* It can also delegate the event handling to a parent dom node
* The event plugin constructor.
* ex: new EventPlugin({method: function(){} ...}, false);
* @param {Object} the object that has the event handling methods
* @param {Boolean} $isMobile if the event handler has to map with touch events
*/
module.exports = function EventPluginConstructor($parent, $isMobile) {

    /**
     * The parent callback
     * @private
     */
    var _parent = null,

    /**
     * Load the tool at runtime so that it doesn't throw an error
     * when not loaded in a browser
     */
    matchesSelector = require("matches-selector"),

    /**
     * The mapping object.
     * @private
     */
    _map = {
        "mousedown" : "touchstart",
        "mouseup" : "touchend",
        "mousemove" : "touchmove"
    },

    /**
     * Is touch device.
     * @private
     */
    _isMobile = !!$isMobile;

    /**
     * Add mapped event listener (for testing purpose).
     * @private
     */
    this.addEventListener = function addEventListener(node, event, callback, useCapture) {
        node.addEventListener(this.map(event), callback, !!useCapture);
    };

    /**
     * Listen to DOM events.
     * @param {Object} node DOM node
     * @param {String} name event's name
     * @param {String} listener callback's name
     * @param {String} useCapture string
     */
    this.listen = function listen(node, name, listener, useCapture) {
        this.addEventListener(node, name, function(e){
            _parent[listener].call(_parent, e, node);
        }, !!useCapture);
    };

    /**
     * Delegate the event handling to a parent DOM element
     * @param {Object} node DOM node
     * @param {String} selector CSS3 selector to the element that listens to the event
     * @param {String} name event's name
     * @param {String} listener callback's name
     * @param {String} useCapture string
     */
    this.delegate = function delegate(node, selector, name, listener, useCapture) {
        this.addEventListener(node, name, function(event){
            if (matchesSelector(event.target, selector)) {
                _parent[listener].call(_parent, event, node);
            }
        }, !!useCapture);
    };

    /**
     * Get the parent object.
     * @return {Object} the parent object
     */
    this.getParent = function getParent() {
        return _parent;
    };

    /**
     * Set the parent object.
     * The parent object is an object which the functions are called by node listeners.
     * @param {Object} the parent object
     * @return true if object has been set
     */
    this.setParent = function setParent(parent) {
        if (parent instanceof Object){
            _parent = parent;
            return true;
        }
        return false;
    };

    /**
     * Get event mapping.
     * @param {String} event's name
     * @return the mapped event's name
     */
    this.map = function map(name) {
        return _isMobile ? (_map[name] || name) : name;
    };

    /**
     * Set event mapping.
     * @param {String} event's name
     * @param {String} event's value
     * @return true if mapped
     */
    this.setMap = function setMap(name, value) {
        if (typeof name == "string" &&
            typeof value == "string") {
            _map[name] = value;
            return true;
        }
        return false;
    };

    //init
    this.setParent($parent);
};

},{"matches-selector":77}],77:[function(require,module,exports){
'use strict';

var proto = Element.prototype;
var vendor = proto.matches
  || proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = el.parentNode.querySelectorAll(selector);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] == el) return true;
  }
  return false;
}
},{}],78:[function(require,module,exports){
/**
* @license local-observable-store https://github.com/cosmosio/local-observable-store
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Store = require("observable-store"),
    loop = require("simple-loop");

/**
 * @class
 * LocalStore is an Emily's Store that can be synchronized with localStorage
 * Synchronize the store, reload your page/browser and resynchronize it with the same value
 * and it gets restored.
 * Only valid JSON data will be stored
 */
function LocalStoreConstructor() {

    /**
     * The name of the property in which to store the data
     * @private
     */
    var _name = null,

    /**
     * The localStorage
     * @private
     */
    _localStorage = localStorage;

    /**
     * Saves the current values in localStorage
     * @private
     */
    function persistLocalStorage() {
        _localStorage.setItem(_name, this.toJSON());
    }

    /**
     * Override default localStorage with a new one
     * @param local$torage the new localStorage
     * @returns {Boolean} true if success
     * @private
     */
    this.setLocalStorage = function setLocalStorage(local$torage) {
        if (local$torage && typeof local$torage.setItem == "function") {
            _localStorage = local$torage;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Get the current localStorage
     * @returns localStorage
     * @private
     */
    this.getLocalStorage = function getLocalStorage() {
        return _localStorage;
    };

    /**
     * Synchronize the store with localStorage
     * @param {String} name the name in which to save the data
     * @returns {Boolean} true if the param is a string
     */
    this.sync = function sync(name) {
        var json;

        if (typeof name == "string") {
            _name = name;
            json = JSON.parse(_localStorage.getItem(name));

            loop(json, function (value, idx) {
                if (!this.has(idx)) {
                    this.set(idx, value);
                }
            }, this);

            persistLocalStorage.call(this);

            // Watch for modifications to update localStorage
            this.watch("added", persistLocalStorage, this);
            this.watch("updated", persistLocalStorage, this);
            this.watch("deleted", persistLocalStorage, this);
            return true;
        } else {
            return false;
        }
    };
}

module.exports = function LocalStoreFactory(init) {
    LocalStoreConstructor.prototype = new Store(init);
    return new LocalStoreConstructor();
};

},{"observable-store":79,"simple-loop":87}],79:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"compare-numbers":80,"nested-property":81,"object-count":82,"shallow-copy":83,"shallow-diff":84,"simple-loop":87,"watch-notify":85}],80:[function(require,module,exports){
module.exports=require(13)
},{}],81:[function(require,module,exports){
module.exports=require(20)
},{"assert":108}],82:[function(require,module,exports){
module.exports=require(18)
},{"assert":108}],83:[function(require,module,exports){
module.exports=require(22)
},{}],84:[function(require,module,exports){
module.exports=require(23)
},{"assert":108,"simple-loop":87}],85:[function(require,module,exports){
module.exports=require(32)
},{"assert":108,"simple-loop":87,"to-array":86}],86:[function(require,module,exports){
module.exports=require(30)
},{}],87:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],88:[function(require,module,exports){
/**
* @license place-plugin https://github.com/flams/place-plugin
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var simpleLoop = require("simple-loop");

/**
* @class
* Place plugin places SeamViews in the DOM.
*/
function isSeamView(ui) {
    return typeof ui == "object" &&
        typeof ui.place == "function";
}

/**
 * Intilialize a Place.plugin with a list of SeamViews
 * @param {Object} $uis a list of SeamViews such as:
 *   {
 *      "header": new SeamView(),
 *      "list": new SeamView()
 *   }
 * @Constructor
 */
module.exports = function PlacePluginConstructor($uis) {

    /**
     * The list of uis currently set in this place plugin
     * @private
     */
    var _uis = {};

    /**
     * Attach a SeamView to this DOM element
     * @param {HTML|SVGElement} node the dom node where to attach the SeamView
     * @param {String} the name of the SeamView to attach
     * @throws {NoSuchSeamView} an error if there's no SeamView for the given name
     */
    this.place = function place(node, name) {
        if (_uis[name]) {
            _uis[name].place(node);
        } else {
            throw new Error(name + " is not a SeamView UI in place: " + name);
        }
    };

    /**
     * Add an SeamView that can be attached to a dom element
     * @param {String} the name of the SeamView to add to the list
     * @param {SeamView} ui the SeamView to add the list
     * @returns {Boolean} true if the SeamView was added
     */
    this.set = function set(name, ui) {
        if (typeof name == "string" && isSeamView(ui)) {
            _uis[name] = ui;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add multiple dom elements at once
     * @param {Object} $uis a list of SeamViews such as:
     *   {
     *      "header": new SeamView(),
     *      "list": new SeamView()
     *   }
     */
    this.setAll = function setAll(uis) {
        simpleLoop(uis, function (ui, name) {
            this.set(name, ui);
        }, this);
    };

    /**
     * Returns a SeamView from the list given its name
     * @param {String} the name of the SeamView to get
     * @returns {SeamView} SeamView for the given name
     */
    this.get = function get(name) {
        return _uis[name];
    };

    if ($uis) {
        this.setAll($uis);
    }

};

},{"simple-loop":89}],89:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],90:[function(require,module,exports){
/**
* @license seam-view https://github.com/flams/seam-view
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var StateMachine = require("synchronous-fsm"),
    Seam = require("seam"),
    toArray = require("to-array");

function isAcceptedType(dom) {
    return dom.nodeType >= 1;
}

/**
* @class
* OObject is a container for dom elements. It will also bind
* the dom to additional plugins like Data binding
* @requires StateMachine
*/
module.exports = function SeamViewConstructor() {

    /**
     * This function creates the dom of the UI from its template
     * It then queries the dom for data- attributes
     * It can't be executed if the template is not set
     * @private
     */
    function render(UI) {

        // The place where the template will be created
        // is either the currentPlace where the node is placed
        // or a temporary div
        var baseNode = _currentPlace || document.createElement("div");

        // If the template is set
        if (UI.template) {
            // In this function, the thisObject is the UI's prototype
            // UI is the UI that has OObject as prototype
            if (typeof UI.template == "string") {
                // Let the browser do the parsing, can't be faster & easier.
                baseNode.innerHTML = UI.template.trim();
            } else if (isAcceptedType(UI.template)) {
                // If it's already an HTML element
                baseNode.appendChild(UI.template);
            }

            // The UI must be placed in a unique dom node
            // If not, there can't be multiple UIs placed in the same parentNode
            // as it wouldn't be possible to know which node would belong to which UI
            // This is probably a DOM limitation.
            if (baseNode.childNodes.length > 1) {
                throw new Error("UI.template should have only one parent node");
            } else {
                UI.dom = baseNode.childNodes[0];
            }

            UI.seam.apply(UI.dom);

        } else {
            // An explicit message I hope
            throw new Error("UI.template must be set prior to render");
        }
    }

    /**
     * This function appends the dom tree to the given dom node.
     * This dom node should be somewhere in the dom of the application
     * @private
     */
    function place(UI, DOMplace, beforeNode) {
        if (DOMplace) {
            // IE (until 9) apparently fails to appendChild when insertBefore's second argument is null, hence this.
            if (beforeNode) {
                DOMplace.insertBefore(UI.dom, beforeNode);
            } else {
                DOMplace.appendChild(UI.dom);
            }
            // Also save the new place, so next renderings
            // will be made inside it
            _currentPlace = DOMplace;
        }
    }

    /**
     * Does rendering & placing in one function
     * @private
     */
    function renderNPlace(UI, dom) {
        render(UI);
        place.apply(null, toArray(arguments));
    }

    /**
     * This stores the current place
     * If this is set, this is the place where new templates
     * will be appended
     * @private
     */
    var _currentPlace = null,

    /**
     * The UI's stateMachine.
     * Much better than if(stuff) do(stuff) else if (!stuff and stuff but not stouff) do (otherstuff)
     * Please open an issue if you want to propose a better one
     * @private
     */
    _stateMachine = new StateMachine("Init", {
        "Init": [["render", render, this, "Rendered"],
                 ["place", renderNPlace, this, "Rendered"]],
        "Rendered": [["place", place, this],
                     ["render", render, this]]
    });

    /**
     * The module that will manage the plugins for this UI
     * @see Olives/Plugins' doc for more info on how it works.
     */
    this.seam = new Seam();

    /**
     * Describes the template, can either be like "&lt;p&gt;&lt;/p&gt;" or HTMLElements
     * @type string or HTMLElement|SVGElement
     */
    this.template = null;

    /**
     * This will hold the dom nodes built from the template.
     */
    this.dom = null;

    /**
     * Place the UI in a given dom node
     * @param  node the node on which to append the UI
     * @param  beforeNode the dom before which to append the UI
     */
    this.place = function place(node, beforeNode) {
        _stateMachine.event("place", this, node, beforeNode);
    };

    /**
     * Renders the template to dom nodes and applies the plugins on it
     * It requires the template to be set first
     */
    this.render = function render() {
        _stateMachine.event("render", this);
    };

    /**
     * Set the UI's template from a DOM element
     * @param {HTMLElement|SVGElement} dom the dom element that'll become the template of the UI
     * @returns true if dom is an HTMLElement|SVGElement
     */
    this.setTemplateFromDom = function setTemplateFromDom(dom) {
        if (isAcceptedType(dom)) {
            this.template = dom;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Transforms dom nodes into a UI.
     * It basically does a setTemplateFromDOM, then a place
     * It's a helper function
     * @param {HTMLElement|SVGElement} node the dom to transform to a UI
     * @returns true if dom is an HTMLElement|SVGElement
     */
    this.alive = function alive(dom) {
        if (isAcceptedType(dom)) {
            this.setTemplateFromDom(dom);
            this.place(dom.parentNode, dom.nextElementSibling);
            return true;
        } else {
            return false;
        }

    };

    /**
     * Get the current dom node where the UI is placed.
     * for debugging purpose
     * @private
     * @return {HTMLElement} node the dom where the UI is placed.
     */
    this.getCurrentPlace = function(){
        return _currentPlace;
    };

};

},{"seam":94,"synchronous-fsm":91,"to-array":93}],91:[function(require,module,exports){
module.exports=require(28)
},{"simple-loop":92,"to-array":93}],92:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],93:[function(require,module,exports){
module.exports=require(30)
},{}],94:[function(require,module,exports){
/**
* @license seam https://github.com/flams/seam
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var toArray = require("to-array"),
    simpleLoop = require("simple-loop"),
    getNodes = require("get-nodes"),
    getDataset = require("get-dataset");

/**
 * Seam makes it easy to attach JS behavior to your HTML/SVG via the data- attribute.
 * <div data-plugin="method: param, param, ..."></tag>
 *
 * JS behaviors are defined in plugins, which are plain JS objects with data and methods.
 */
module.exports = function Seam($plugins) {

    /**
     * The list of plugins
     * @private
     */
    var _plugins = {},

    /**
     * Just a "functionalification" of trim
     * for code readability
     * @private
     */
    trim = function trim(string) {
        return string.trim();
    },

    /**
     * Call the plugins methods, passing them the dom node
     * A phrase can be :
     * <tag data-plugin='method: param, param; method:param...'/>
     * the function has to call every method of the plugin
     * passing it the node, and the given params
     * @private
     */
    applyPlugin = function applyPlugin(node, phrase, plugin) {
        // Split the methods
        phrase.split(";")
        .forEach(function (couple) {
            // Split the result between method and params
            var split = couple.split(":"),
            // Trim the name
            method = split[0].trim(),
            // And the params, if any
            params = split[1] ? split[1].split(",").map(trim) : [];

            // The first param must be the dom node
            params.unshift(node);

            if (_plugins[plugin] && _plugins[plugin][method]) {
                // Call the method with the following params for instance :
                // [node, "param1", "param2" .. ]
                _plugins[plugin][method].apply(_plugins[plugin], params);
            }

        });
    };

    /**
     * Add a plugin
     *
     * Note that once added, the function adds a "plugins" property to the plugin.
     * It's an object that holds a name property, with the registered name of the plugin
     * and an apply function, to use on new nodes that the plugin would generate
     *
     * @param {String} name the name of the data that the plugin should look for
     * @param {Object} plugin the plugin that has the functions to execute
     * @returns true if plugin successfully added.
     */
    this.add = function add(name, plugin) {
        var propertyName = "plugins";

        if (typeof name == "string" && typeof plugin == "object" && plugin) {
            _plugins[name] = plugin;

            plugin[propertyName] = {
                    name: name,
                    apply: function apply() {
                        return this.apply.apply(this, arguments);
                    }.bind(this)
            };
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add multiple plugins at once
     * @param {Object} list key is the plugin name and value is the plugin
     * @returns true if correct param
     */
    this.addAll = function addAll(list) {
        return simpleLoop(list, function (plugin, name) {
            this.add(name, plugin);
        }, this);
    };

    /**
     * Get a previously added plugin
     * @param {String} name the name of the plugin
     * @returns {Object} the plugin
     */
    this.get = function get(name) {
        return _plugins[name];
    };

    /**
     * Delete a plugin from the list
     * @param {String} name the name of the plugin
     * @returns {Boolean} true if success
     */
    this.del = function del(name) {
        return delete _plugins[name];
    };

    /**
     * Apply the plugins to a NodeList
     * @param {HTMLElement|SVGElement} dom the dom nodes on which to apply the plugins
     * @returns {Boolean} true if the param is a dom node
     */
    this.apply = function apply(dom) {
        var nodes = getNodes(dom);

        simpleLoop(toArray(nodes), function (node) {
            simpleLoop(getDataset(node), function (phrase, plugin) {
                applyPlugin(node, phrase, plugin);
            });
        });

        return dom;
    };

    if ($plugins) {
        this.addAll($plugins);
    }

};

},{"get-dataset":95,"get-nodes":96,"simple-loop":97,"to-array":98}],95:[function(require,module,exports){
module.exports=require(68)
},{}],96:[function(require,module,exports){
module.exports=require(69)
},{"to-array":98}],97:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],98:[function(require,module,exports){
module.exports=require(30)
},{}],99:[function(require,module,exports){
/**
* @license socketio-transport https://github.com/cosmosio/socketio-transport
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

/**
 * Defines the SocketIOTransport
 * @private
 * @param {Object} $io socket.io's object
 * @returns
 */
module.exports = function SocketIOTransportConstructor($socket) {

	/**
	 * @private
	 * The socket.io's socket
	 */
	var _socket = null;

	/**
	 * Set the socket created by SocketIO
	 * @param {Object} socket the socket.io socket
	 * @returns true if it seems to be a socket.io socket
	 */
	this.setSocket = function setSocket(socket) {
		if (socket && typeof socket.emit == "function") {
			_socket = socket;
			return true;
		} else {
			return false;
		}
	};

	/**
	 * Get the socket, for debugging purpose
	 * @private
	 * @returns {Object} the socket
	 */
	this.getSocket = function getSocket() {
		return _socket;
	};

	/**
	 * Subscribe to a socket event
	 * @param {String} event the name of the event
	 * @param {Function} func the function to execute when the event fires
	 */
	this.on = function on(event, func) {
		return _socket.on(event, func);
	};

	/**
	 * Subscribe to a socket event but disconnect as soon as it fires.
	 * @param {String} event the name of the event
	 * @param {Function} func the function to execute when the event fires
	 */
	this.once = function once(event, func) {
		return _socket.once(event, func);
	};

	/**
	 * Publish an event on the socket
	 * @param {String} event the event to publish
	 * @param data
	 * @param {Function} callback is the function to be called for ack
	 */
	this.emit = function emit(event, data, callback) {
		return _socket.emit(event, data, callback);
	};

	/**
	 * Stop listening to events on a channel
	 * @param {String} event the event to publish
	 * @param data
	 * @param {Function} callback is the function to be called for ack
	 */
	this.removeListener = function removeListener(event, data, callback) {
		return _socket.removeListener(event, data, callback);
	};

	/**
	 * Make a request on the node server
	 * @param {String} channel watch the server's documentation to see available channels
	 * @param data the request data, it could be anything
	 * @param {Function} func the callback that will get the response.
	 * @param {Object} scope the scope in which to execute the callback
	 */
	this.request = function request(channel, data, func, scope) {
		if (typeof channel == "string" &&
				typeof data != "undefined") {

			var reqData = {
					eventId: Date.now() + Math.floor(Math.random()*1e6),
					data: data
				},
				boundCallback = function () {
					if (func) {
						func.apply(scope || null, arguments);
					}
				};

			this.once(reqData.eventId, boundCallback);

			this.emit(channel, reqData);

			return true;
		} else {
			return false;
		}
	};

	/**
	 * Listen to an url and get notified on new data
	 * @param {String} channel watch the server's documentation to see available channels
	 * @param data the request data, it could be anything
	 * @param {Function} func the callback that will get the data
	 * @param {Object} scope the scope in which to execute the callback
	 * @returns
	 */
	this.listen = function listen(channel, data, func, scope) {
		if (typeof channel == "string" &&
				typeof data != "undefined" &&
				typeof func == "function") {

			var reqData = {
					eventId: Date.now() + Math.floor(Math.random()*1e6),
					data: data,
					keepAlive: true
				},
				boundCallback = function () {
					if (func) {
						func.apply(scope || null, arguments);
					}
				},
				that = this;

			this.on(reqData.eventId, boundCallback);

			this.emit(channel, reqData);

			return function stop() {
				that.emit("disconnect-" + reqData.eventId);
				that.removeListener(reqData.eventId, boundCallback);
			};
		} else {
			return false;
		}
	};

	/**
	 * Sets the socket.io
	 */
	this.setSocket($socket);
};

},{}],100:[function(require,module,exports){
/**
* @license socketio-transport https://github.com/cosmosio/socketio-transport
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

module.exports = {
    Client: require("./client/index"),
    Server: require("./server/index")
};

},{"./client/index":99,"./server/index":101}],101:[function(require,module,exports){
/**
* @license socketio-transport https://github.com/cosmosio/socketio-transport
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 */
var isConnected = false;

module.exports = function registerSocketIO(io, handlers) {

    if (isConnected) {
        return false;
    } else {

        // On connection we'll reference the handlers in socket.io
        io.sockets.on("connection", function (socket) {

            var connectHandler = function (func, handler) {
                // When a handler is called
                socket.on(handler, function (reqData) {

                    // Add socket.io's handshake for session management
                    reqData.data.handshake = socket.handshake;

                    // pass it the requests data
                    var stop = func(reqData.data,
                        // The function to handle the result
                        function onEnd(body) {
                            socket.emit(reqData.eventId, body);
                        },
                        // The function to handle chunks for a kept alive socket
                        function onData(chunk) {
                            reqData.keepAlive && socket.emit(reqData.eventId, ""+chunk);
                        });

                    // If func returned a stop function
                    if (typeof stop == "function") {
                        // Subscribe to disconnect-eventId event
                        socket.on("disconnect-"+reqData.eventId, stop);
                    }

                });

            };

            // for each handler, described in Emily as they can be used from node.js as well
            handlers.loop(connectHandler);
            // Also connect on new handlers
            handlers.watch("added", connectHandler);

        });

        isConnected = true;
    }
};

},{}],102:[function(require,module,exports){
/**
* @license url-highway https://github.com/cosmosio/url-highway
*
* The MIT License (MIT)
*
* Copyright (c) 2014 Olivier Scherrer <pode.fr@gmail.com>
*/
"use strict";

var Highway = require("highway"),
    toArray = require("to-array");

/**
 * @class
 * UrlHighway is a router which navigates to the route defined in the URL and updates this URL
 * while navigating. It's a subtype of Highway
 */
function UrlHighway() {

    /**
     * The handle on the watch
     * @private
     */
    var _watchHandle,

    /**
     * The default route to navigate to when nothing is supplied in the url
     * @private
     */
    _defaultRoute = "",

    /**
     * The last route that was navigated to
     * @private
     */
    _lastRoute = window.location.hash;

    /**
     * Navigates to the current hash or to the default route if none is supplied in the url
     * @private
     */
     /*jshint validthis:true*/
    function doNavigate() {
        if (!hashIsEmpty()) {
            var parsedHash = this.parse(window.location.hash);
            this.navigate.apply(this, parsedHash);
        } else {
            this.navigate(_defaultRoute);
        }
    }

    /**
     * An empty string or # are both empty hashes
     */
    function hashIsEmpty() {
        return !window.location.hash || window.location.hash == "#";
    }

    /**
     * Set the default route to navigate to when nothing is defined in the url
     * @param {String} defaultRoute the defaultRoute to navigate to
     * @returns {Boolean} true if it's not an empty string
     */
    this.setDefaultRoute = function setDefaultRoute(defaultRoute) {
        if (defaultRoute && typeof defaultRoute == "string") {
            _defaultRoute = defaultRoute;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Get the currently set default route
     * @returns {String} the default route
     */
    this.getDefaultRoute = function getDefaultRoute() {
        return _defaultRoute;
    };

    /**
     * The function that parses the url to determine the route to navigate to.
     * It has a default behavior explained below, but can be overriden as long as
     * it has the same contract.
     * @param {String} hash the hash coming from window.location.has
     * @returns {Array} has to return an array with the list of arguments to call
     *    navigate with. The first item of the array must be the name of the route.
     *
     * Example: #album/holiday/2013
     *      will navigate to the route "album" and give two arguments "holiday" and "2013"
     */
    this.parse = function parse(hash) {
        return hash.split("#").pop().split("/");
    };

    /**
     * The function that converts, or serialises the route and its arguments to a valid URL.
     * It has a default behavior below, but can be overriden as long as it has the same contract.
     * @param {Array} args the list of arguments to serialize
     * @returns {String} the serialized arguments to add to the url hashmark
     *
     * Example:
     *      ["album", "holiday", "2013"];
     *      will give "album/holiday/2013"
     *
     */
    this.toUrl = function toUrl(args) {
        return args.join("/");
    };

    /**
     * When all the routes and handlers have been defined, start the location router
     * so it parses the URL and navigates to the corresponding route.
     * It will also start listening to route changes and hashmark changes to navigate.
     * While navigating, the hashmark itself will also change to reflect the current route state
     */
    this.start = function start(defaultRoute) {
        this.setDefaultRoute(defaultRoute);
        doNavigate.call(this);
        this.bindOnHashChange();
        this.bindOnRouteChange();
    };

    /**
     * Remove the events handler for cleaning.
     */
    this.destroy = function destroy() {
        this.unwatch(_watchHandle);
        window.removeEventListener("hashchange", this.boundOnHashChange, true);
    };

    /**
     * Parse the hash and navigate to the corresponding url
     * @private
     */
    this.onHashChange  = function onHashChange() {
        if (window.location.hash != _lastRoute) {
            doNavigate.call(this);
        }
    };

    /**
     * The bound version of onHashChange for add/removeEventListener
     * @private
     */
    this.boundOnHashChange = this.onHashChange.bind(this);

    /**
     * Add an event listener to hashchange to navigate to the corresponding route
     * when it changes
     * @private
     */
    this.bindOnHashChange = function bindOnHashChange() {
        window.addEventListener("hashchange", this.boundOnHashChange, true);
    };

    /**
     * Watch route change events from the router to update the location
     * @private
     */
    this.bindOnRouteChange = function bindOnRouteChange() {
        _watchHandle = this.watch(this.onRouteChange, this);
    };

    /**
     * The handler for when the route changes
     * It updates the location
     * @private
     */
    this.onRouteChange = function onRouteChange() {
        window.location.hash = this.toUrl(toArray(arguments));
        _lastRoute = window.location.hash;
    };

    this.getLastRoute = function getLastRoute() {
        return _lastRoute;
    };

}

module.exports = function UrlHighwayFactory() {
    UrlHighway.prototype = new Highway();
    UrlHighway.constructor = Highway;
    return new UrlHighway();
};

},{"highway":103,"to-array":106}],103:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"to-array":106,"watch-notify":104}],104:[function(require,module,exports){
module.exports=require(32)
},{"assert":108,"simple-loop":105,"to-array":106}],105:[function(require,module,exports){
module.exports=require(21)
},{"assert":108}],106:[function(require,module,exports){
module.exports=require(30)
},{}],107:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
 "use strict";

module.exports = {
    "Bind.plugin": require("data-binding-plugin"),
    "LocalStore": require("local-observable-store"),
    "LocationRouter": require("url-highway"),
    "OObject": require("seam-view"),
    "Event.plugin": require("event-plugin"),
    "Place.plugin": require("place-plugin"),
    "Plugins": require("seam"),
    "SocketIOTransport": require("socketio-transport"),
    "Stack": require("dom-stack")
};

},{"data-binding-plugin":65,"dom-stack":74,"event-plugin":76,"local-observable-store":78,"place-plugin":88,"seam":94,"seam-view":90,"socketio-transport":100,"url-highway":102}],108:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":116}],109:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],110:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"PcZj9L":[function(require,module,exports){
var TA = require('typedarray')
var xDataView = typeof DataView === 'undefined'
  ? TA.DataView : DataView
var xArrayBuffer = typeof ArrayBuffer === 'undefined'
  ? TA.ArrayBuffer : ArrayBuffer
var xUint8Array = typeof Uint8Array === 'undefined'
  ? TA.Uint8Array : Uint8Array

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

var browserSupport

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 *
 * Firefox is a special case because it doesn't allow augmenting "native" object
 * instances. See `ProxyBuffer` below for more details.
 */
function Buffer (subject, encoding) {
  var type = typeof subject

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf = augment(new xUint8Array(length))
  if (Buffer.isBuffer(subject)) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf.set(subject)
  } else if (isArrayIsh(subject)) {
    // Treat array-ish objects as a byte array.
    for (var i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true

    default:
      return false
  }
}

Buffer.isBuffer = function isBuffer (b) {
  return b && b._isBuffer
}

Buffer.byteLength = function (str, encoding) {
  switch (encoding || 'utf8') {
    case 'hex':
      return str.length / 2

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length

    case 'ascii':
    case 'binary':
      return str.length

    case 'base64':
      return base64ToBytes(str).length

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error('Usage: Buffer.concat(list, [totalLength])\n' +
        'list should be an Array.')
  }

  var i
  var buf

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      buf = list[i]
      totalLength += buf.length
    }
  }

  var buffer = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    buf = list[i]
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

// INSTANCE METHODS
// ================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) {
    throw new Error('Invalid hex string')
  }
  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
}

function _asciiWrite (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
}

function BufferWrite (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  switch (encoding) {
    case 'hex':
      return _hexWrite(this, string, offset, length)

    case 'utf8':
    case 'utf-8':
      return _utf8Write(this, string, offset, length)

    case 'ascii':
      return _asciiWrite(this, string, offset, length)

    case 'binary':
      return _binaryWrite(this, string, offset, length)

    case 'base64':
      return _base64Write(this, string, offset, length)

    default:
      throw new Error('Unknown encoding')
  }
}

function BufferToString (encoding, start, end) {
  var self = (this instanceof ProxyBuffer)
    ? this._proxy
    : this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  switch (encoding) {
    case 'hex':
      return _hexSlice(self, start, end)

    case 'utf8':
    case 'utf-8':
      return _utf8Slice(self, start, end)

    case 'ascii':
      return _asciiSlice(self, start, end)

    case 'binary':
      return _binarySlice(self, start, end)

    case 'base64':
      return _base64Slice(self, start, end)

    default:
      throw new Error('Unknown encoding')
  }
}

function BufferToJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
function BufferCopy (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start)
    throw new Error('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new Error('targetStart out of bounds')
  if (start < 0 || start >= source.length)
    throw new Error('sourceStart out of bounds')
  if (end < 0 || end > source.length)
    throw new Error('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  var bytes = buf.slice(start, end)
  return require('base64-js').fromByteArray(bytes)
}

function _utf8Slice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  var tmp = ''
  var i = 0
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i])
      tmp = ''
    } else {
      tmp += '%' + bytes[i].toString(16)
    }

    i++
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var ret = ''
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

// TODO: add test that modifying the new buffer slice will modify memory in the
// original buffer! Use code from:
// http://nodejs.org/api/buffer.html#buffer_buf_slice_start_end
function BufferSlice (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)
  return augment(this.subarray(start, end)) // Uint8Array built-in method
}

function BufferReadUInt8 (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  return buf[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 1 === len) {
    var dv = new xDataView(new xArrayBuffer(2))
    dv.setUint8(0, buf[len - 1])
    return dv.getUint16(0, littleEndian)
  } else {
    return buf._dataview.getUint16(offset, littleEndian)
  }
}

function BufferReadUInt16LE (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

function BufferReadUInt16BE (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 3 >= len) {
    var dv = new xDataView(new xArrayBuffer(4))
    for (var i = 0; i + offset < len; i++) {
      dv.setUint8(i, buf[i + offset])
    }
    return dv.getUint32(0, littleEndian)
  } else {
    return buf._dataview.getUint32(offset, littleEndian)
  }
}

function BufferReadUInt32LE (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

function BufferReadUInt32BE (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

function BufferReadInt8 (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  return buf._dataview.getInt8(offset)
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 1 === len) {
    var dv = new xDataView(new xArrayBuffer(2))
    dv.setUint8(0, buf[len - 1])
    return dv.getInt16(0, littleEndian)
  } else {
    return buf._dataview.getInt16(offset, littleEndian)
  }
}

function BufferReadInt16LE (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

function BufferReadInt16BE (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 3 >= len) {
    var dv = new xDataView(new xArrayBuffer(4))
    for (var i = 0; i + offset < len; i++) {
      dv.setUint8(i, buf[i + offset])
    }
    return dv.getInt32(0, littleEndian)
  } else {
    return buf._dataview.getInt32(offset, littleEndian)
  }
}

function BufferReadInt32LE (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

function BufferReadInt32BE (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return buf._dataview.getFloat32(offset, littleEndian)
}

function BufferReadFloatLE (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

function BufferReadFloatBE (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return buf._dataview.getFloat64(offset, littleEndian)
}

function BufferReadDoubleLE (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

function BufferReadDoubleBE (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

function BufferWriteUInt8 (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= buf.length) return

  buf[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 1 === len) {
    var dv = new xDataView(new xArrayBuffer(2))
    dv.setUint16(0, value, littleEndian)
    buf[offset] = dv.getUint8(0)
  } else {
    buf._dataview.setUint16(offset, value, littleEndian)
  }
}

function BufferWriteUInt16LE (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

function BufferWriteUInt16BE (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 3 >= len) {
    var dv = new xDataView(new xArrayBuffer(4))
    dv.setUint32(0, value, littleEndian)
    for (var i = 0; i + offset < len; i++) {
      buf[i + offset] = dv.getUint8(i)
    }
  } else {
    buf._dataview.setUint32(offset, value, littleEndian)
  }
}

function BufferWriteUInt32LE (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

function BufferWriteUInt32BE (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

function BufferWriteInt8 (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= buf.length) return

  buf._dataview.setInt8(offset, value)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 1 === len) {
    var dv = new xDataView(new xArrayBuffer(2))
    dv.setInt16(0, value, littleEndian)
    buf[offset] = dv.getUint8(0)
  } else {
    buf._dataview.setInt16(offset, value, littleEndian)
  }
}

function BufferWriteInt16LE (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

function BufferWriteInt16BE (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 3 >= len) {
    var dv = new xDataView(new xArrayBuffer(4))
    dv.setInt32(0, value, littleEndian)
    for (var i = 0; i + offset < len; i++) {
      buf[i + offset] = dv.getUint8(i)
    }
  } else {
    buf._dataview.setInt32(offset, value, littleEndian)
  }
}

function BufferWriteInt32LE (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

function BufferWriteInt32BE (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 3 >= len) {
    var dv = new xDataView(new xArrayBuffer(4))
    dv.setFloat32(0, value, littleEndian)
    for (var i = 0; i + offset < len; i++) {
      buf[i + offset] = dv.getUint8(i)
    }
  } else {
    buf._dataview.setFloat32(offset, value, littleEndian)
  }
}

function BufferWriteFloatLE (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

function BufferWriteFloatBE (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof (littleEndian) === 'boolean',
        'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len) {
    return
  } else if (offset + 7 >= len) {
    var dv = new xDataView(new xArrayBuffer(8))
    dv.setFloat64(0, value, littleEndian)
    for (var i = 0; i + offset < len; i++) {
      buf[i + offset] = dv.getUint8(i)
    }
  } else {
    buf._dataview.setFloat64(offset, value, littleEndian)
  }
}

function BufferWriteDoubleLE (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

function BufferWriteDoubleBE (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
function BufferFill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('value is not a number')
  }

  if (end < start) throw new Error('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds')
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds')
  }

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

function BufferInspect () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

// Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
// Added in Node 0.12.
function BufferToArrayBuffer () {
  return (new Buffer(this)).buffer
}


// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

/**
 * Check to see if the browser supports augmenting a `Uint8Array` instance.
 * @return {boolean}
 */
function _browserSupport () {
  var arr = new xUint8Array(0)
  arr.foo = function () { return 42 }

  try {
    return (42 === arr.foo())
  } catch (e) {
    return false
  }
}

/**
 * Class: ProxyBuffer
 * ==================
 *
 * Only used in Firefox, since Firefox does not allow augmenting "native"
 * objects (like Uint8Array instances) with new properties for some unknown
 * (probably silly) reason. So we'll use an ES6 Proxy (supported since
 * Firefox 18) to wrap the Uint8Array instance without actually adding any
 * properties to it.
 *
 * Instances of this "fake" Buffer class are the "target" of the
 * ES6 Proxy (see `augment` function).
 *
 * We couldn't just use the `Uint8Array` as the target of the `Proxy` because
 * Proxies have an important limitation on trapping the `toString` method.
 * `Object.prototype.toString.call(proxy)` gets called whenever something is
 * implicitly cast to a String. Unfortunately, with a `Proxy` this
 * unconditionally returns `Object.prototype.toString.call(target)` which would
 * always return "[object Uint8Array]" if we used the `Uint8Array` instance as
 * the target. And, remember, in Firefox we cannot redefine the `Uint8Array`
 * instance's `toString` method.
 *
 * So, we use this `ProxyBuffer` class as the proxy's "target". Since this class
 * has its own custom `toString` method, it will get called whenever `toString`
 * gets called, implicitly or explicitly, on the `Proxy` instance.
 *
 * We also have to define the Uint8Array methods `subarray` and `set` on
 * `ProxyBuffer` because if we didn't then `proxy.subarray(0)` would have its
 * `this` set to `proxy` (a `Proxy` instance) which throws an exception in
 * Firefox which expects it to be a `TypedArray` instance.
 */
function ProxyBuffer (arr) {
  this._arr = arr

  if (arr.byteLength !== 0)
    this._dataview = new xDataView(arr.buffer, arr.byteOffset, arr.byteLength)
}

ProxyBuffer.prototype.write = BufferWrite
ProxyBuffer.prototype.toString = BufferToString
ProxyBuffer.prototype.toLocaleString = BufferToString
ProxyBuffer.prototype.toJSON = BufferToJSON
ProxyBuffer.prototype.copy = BufferCopy
ProxyBuffer.prototype.slice = BufferSlice
ProxyBuffer.prototype.readUInt8 = BufferReadUInt8
ProxyBuffer.prototype.readUInt16LE = BufferReadUInt16LE
ProxyBuffer.prototype.readUInt16BE = BufferReadUInt16BE
ProxyBuffer.prototype.readUInt32LE = BufferReadUInt32LE
ProxyBuffer.prototype.readUInt32BE = BufferReadUInt32BE
ProxyBuffer.prototype.readInt8 = BufferReadInt8
ProxyBuffer.prototype.readInt16LE = BufferReadInt16LE
ProxyBuffer.prototype.readInt16BE = BufferReadInt16BE
ProxyBuffer.prototype.readInt32LE = BufferReadInt32LE
ProxyBuffer.prototype.readInt32BE = BufferReadInt32BE
ProxyBuffer.prototype.readFloatLE = BufferReadFloatLE
ProxyBuffer.prototype.readFloatBE = BufferReadFloatBE
ProxyBuffer.prototype.readDoubleLE = BufferReadDoubleLE
ProxyBuffer.prototype.readDoubleBE = BufferReadDoubleBE
ProxyBuffer.prototype.writeUInt8 = BufferWriteUInt8
ProxyBuffer.prototype.writeUInt16LE = BufferWriteUInt16LE
ProxyBuffer.prototype.writeUInt16BE = BufferWriteUInt16BE
ProxyBuffer.prototype.writeUInt32LE = BufferWriteUInt32LE
ProxyBuffer.prototype.writeUInt32BE = BufferWriteUInt32BE
ProxyBuffer.prototype.writeInt8 = BufferWriteInt8
ProxyBuffer.prototype.writeInt16LE = BufferWriteInt16LE
ProxyBuffer.prototype.writeInt16BE = BufferWriteInt16BE
ProxyBuffer.prototype.writeInt32LE = BufferWriteInt32LE
ProxyBuffer.prototype.writeInt32BE = BufferWriteInt32BE
ProxyBuffer.prototype.writeFloatLE = BufferWriteFloatLE
ProxyBuffer.prototype.writeFloatBE = BufferWriteFloatBE
ProxyBuffer.prototype.writeDoubleLE = BufferWriteDoubleLE
ProxyBuffer.prototype.writeDoubleBE = BufferWriteDoubleBE
ProxyBuffer.prototype.fill = BufferFill
ProxyBuffer.prototype.inspect = BufferInspect
ProxyBuffer.prototype.toArrayBuffer = BufferToArrayBuffer
ProxyBuffer.prototype._isBuffer = true
ProxyBuffer.prototype.subarray = function () {
  return this._arr.subarray.apply(this._arr, arguments)
}
ProxyBuffer.prototype.set = function () {
  return this._arr.set.apply(this._arr, arguments)
}

var ProxyHandler = {
  get: function (target, name) {
    if (name in target) return target[name]
    else return target._arr[name]
  },
  set: function (target, name, value) {
    target._arr[name] = value
  }
}

function augment (arr) {
  if (browserSupport === undefined) {
    browserSupport = _browserSupport()
  }

  if (browserSupport) {
    // Augment the Uint8Array *instance* (not the class!) with Buffer methods
    arr.write = BufferWrite
    arr.toString = BufferToString
    arr.toLocaleString = BufferToString
    arr.toJSON = BufferToJSON
    arr.copy = BufferCopy
    arr.slice = BufferSlice
    arr.readUInt8 = BufferReadUInt8
    arr.readUInt16LE = BufferReadUInt16LE
    arr.readUInt16BE = BufferReadUInt16BE
    arr.readUInt32LE = BufferReadUInt32LE
    arr.readUInt32BE = BufferReadUInt32BE
    arr.readInt8 = BufferReadInt8
    arr.readInt16LE = BufferReadInt16LE
    arr.readInt16BE = BufferReadInt16BE
    arr.readInt32LE = BufferReadInt32LE
    arr.readInt32BE = BufferReadInt32BE
    arr.readFloatLE = BufferReadFloatLE
    arr.readFloatBE = BufferReadFloatBE
    arr.readDoubleLE = BufferReadDoubleLE
    arr.readDoubleBE = BufferReadDoubleBE
    arr.writeUInt8 = BufferWriteUInt8
    arr.writeUInt16LE = BufferWriteUInt16LE
    arr.writeUInt16BE = BufferWriteUInt16BE
    arr.writeUInt32LE = BufferWriteUInt32LE
    arr.writeUInt32BE = BufferWriteUInt32BE
    arr.writeInt8 = BufferWriteInt8
    arr.writeInt16LE = BufferWriteInt16LE
    arr.writeInt16BE = BufferWriteInt16BE
    arr.writeInt32LE = BufferWriteInt32LE
    arr.writeInt32BE = BufferWriteInt32BE
    arr.writeFloatLE = BufferWriteFloatLE
    arr.writeFloatBE = BufferWriteFloatBE
    arr.writeDoubleLE = BufferWriteDoubleLE
    arr.writeDoubleBE = BufferWriteDoubleBE
    arr.fill = BufferFill
    arr.inspect = BufferInspect
    arr.toArrayBuffer = BufferToArrayBuffer
    arr._isBuffer = true

    if (arr.byteLength !== 0)
      arr._dataview = new xDataView(arr.buffer, arr.byteOffset, arr.byteLength)

    return arr

  } else {
    // This is a browser that doesn't support augmenting the `Uint8Array`
    // instance (*ahem* Firefox) so use an ES6 `Proxy`.
    var proxyBuffer = new ProxyBuffer(arr)
    var proxy = new Proxy(proxyBuffer, ProxyHandler)
    proxyBuffer._proxy = proxy
    return proxy
  }
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArrayIsh (subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }

  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }

  return byteArray
}

function base64ToBytes (str) {
  return require('base64-js').toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos, i = 0
  while (i < length) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break

    dst[i + offset] = src[i]
    i++
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint (value, max) {
  assert(typeof (value) == 'number', 'cannot write a non-number as a number')
  assert(value >= 0,
      'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert(typeof (value) == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754(value, max, min) {
  assert(typeof (value) == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":3,"typedarray":4}],"native-buffer-browserify":[function(require,module,exports){
module.exports=require('PcZj9L');
},{}],3:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],4:[function(require,module,exports){
var undefined = (void 0); // Paranoia

// Beyond this value, index getters/setters (i.e. array[0], array[1]) are so slow to
// create, and consume so much memory, that the browser appears frozen.
var MAX_ARRAY_LENGTH = 1e5;

// Approximations of internal ECMAScript conversion functions
var ECMAScript = (function() {
  // Stash a copy in case other scripts modify these
  var opts = Object.prototype.toString,
      ophop = Object.prototype.hasOwnProperty;

  return {
    // Class returns internal [[Class]] property, used to avoid cross-frame instanceof issues:
    Class: function(v) { return opts.call(v).replace(/^\[object *|\]$/g, ''); },
    HasProperty: function(o, p) { return p in o; },
    HasOwnProperty: function(o, p) { return ophop.call(o, p); },
    IsCallable: function(o) { return typeof o === 'function'; },
    ToInt32: function(v) { return v >> 0; },
    ToUint32: function(v) { return v >>> 0; }
  };
}());

// Snapshot intrinsics
var LN2 = Math.LN2,
    abs = Math.abs,
    floor = Math.floor,
    log = Math.log,
    min = Math.min,
    pow = Math.pow,
    round = Math.round;

// ES5: lock down object properties
function configureProperties(obj) {
  if (getOwnPropertyNames && defineProperty) {
    var props = getOwnPropertyNames(obj), i;
    for (i = 0; i < props.length; i += 1) {
      defineProperty(obj, props[i], {
        value: obj[props[i]],
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
}

// emulate ES5 getter/setter API using legacy APIs
// http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
// (second clause tests for Object.defineProperty() in IE<9 that only supports extending DOM prototypes, but
// note that IE<9 does not support __defineGetter__ or __defineSetter__ so it just renders the method harmless)
var defineProperty = Object.defineProperty || function(o, p, desc) {
  if (!o === Object(o)) throw new TypeError("Object.defineProperty called on non-object");
  if (ECMAScript.HasProperty(desc, 'get') && Object.prototype.__defineGetter__) { Object.prototype.__defineGetter__.call(o, p, desc.get); }
  if (ECMAScript.HasProperty(desc, 'set') && Object.prototype.__defineSetter__) { Object.prototype.__defineSetter__.call(o, p, desc.set); }
  if (ECMAScript.HasProperty(desc, 'value')) { o[p] = desc.value; }
  return o;
};

var getOwnPropertyNames = Object.getOwnPropertyNames || function getOwnPropertyNames(o) {
  if (o !== Object(o)) throw new TypeError("Object.getOwnPropertyNames called on non-object");
  var props = [], p;
  for (p in o) {
    if (ECMAScript.HasOwnProperty(o, p)) {
      props.push(p);
    }
  }
  return props;
};

// ES5: Make obj[index] an alias for obj._getter(index)/obj._setter(index, value)
// for index in 0 ... obj.length
function makeArrayAccessors(obj) {
  if (!defineProperty) { return; }

  if (obj.length > MAX_ARRAY_LENGTH) throw new RangeError("Array too large for polyfill");

  function makeArrayAccessor(index) {
    defineProperty(obj, index, {
      'get': function() { return obj._getter(index); },
      'set': function(v) { obj._setter(index, v); },
      enumerable: true,
      configurable: false
    });
  }

  var i;
  for (i = 0; i < obj.length; i += 1) {
    makeArrayAccessor(i);
  }
}

// Internal conversion functions:
//    pack<Type>()   - take a number (interpreted as Type), output a byte array
//    unpack<Type>() - take a byte array, output a Type-like number

function as_signed(value, bits) { var s = 32 - bits; return (value << s) >> s; }
function as_unsigned(value, bits) { var s = 32 - bits; return (value << s) >>> s; }

function packI8(n) { return [n & 0xff]; }
function unpackI8(bytes) { return as_signed(bytes[0], 8); }

function packU8(n) { return [n & 0xff]; }
function unpackU8(bytes) { return as_unsigned(bytes[0], 8); }

function packU8Clamped(n) { n = round(Number(n)); return [n < 0 ? 0 : n > 0xff ? 0xff : n & 0xff]; }

function packI16(n) { return [(n >> 8) & 0xff, n & 0xff]; }
function unpackI16(bytes) { return as_signed(bytes[0] << 8 | bytes[1], 16); }

function packU16(n) { return [(n >> 8) & 0xff, n & 0xff]; }
function unpackU16(bytes) { return as_unsigned(bytes[0] << 8 | bytes[1], 16); }

function packI32(n) { return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]; }
function unpackI32(bytes) { return as_signed(bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3], 32); }

function packU32(n) { return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]; }
function unpackU32(bytes) { return as_unsigned(bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3], 32); }

function packIEEE754(v, ebits, fbits) {

  var bias = (1 << (ebits - 1)) - 1,
      s, e, f, ln,
      i, bits, str, bytes;

  function roundToEven(n) {
    var w = floor(n), f = n - w;
    if (f < 0.5)
      return w;
    if (f > 0.5)
      return w + 1;
    return w % 2 ? w + 1 : w;
  }

  // Compute sign, exponent, fraction
  if (v !== v) {
    // NaN
    // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
    e = (1 << ebits) - 1; f = pow(2, fbits - 1); s = 0;
  } else if (v === Infinity || v === -Infinity) {
    e = (1 << ebits) - 1; f = 0; s = (v < 0) ? 1 : 0;
  } else if (v === 0) {
    e = 0; f = 0; s = (1 / v === -Infinity) ? 1 : 0;
  } else {
    s = v < 0;
    v = abs(v);

    if (v >= pow(2, 1 - bias)) {
      e = min(floor(log(v) / LN2), 1023);
      f = roundToEven(v / pow(2, e) * pow(2, fbits));
      if (f / pow(2, fbits) >= 2) {
        e = e + 1;
        f = 1;
      }
      if (e > bias) {
        // Overflow
        e = (1 << ebits) - 1;
        f = 0;
      } else {
        // Normalized
        e = e + bias;
        f = f - pow(2, fbits);
      }
    } else {
      // Denormalized
      e = 0;
      f = roundToEven(v / pow(2, 1 - bias - fbits));
    }
  }

  // Pack sign, exponent, fraction
  bits = [];
  for (i = fbits; i; i -= 1) { bits.push(f % 2 ? 1 : 0); f = floor(f / 2); }
  for (i = ebits; i; i -= 1) { bits.push(e % 2 ? 1 : 0); e = floor(e / 2); }
  bits.push(s ? 1 : 0);
  bits.reverse();
  str = bits.join('');

  // Bits to bytes
  bytes = [];
  while (str.length) {
    bytes.push(parseInt(str.substring(0, 8), 2));
    str = str.substring(8);
  }
  return bytes;
}

function unpackIEEE754(bytes, ebits, fbits) {

  // Bytes to bits
  var bits = [], i, j, b, str,
      bias, s, e, f;

  for (i = bytes.length; i; i -= 1) {
    b = bytes[i - 1];
    for (j = 8; j; j -= 1) {
      bits.push(b % 2 ? 1 : 0); b = b >> 1;
    }
  }
  bits.reverse();
  str = bits.join('');

  // Unpack sign, exponent, fraction
  bias = (1 << (ebits - 1)) - 1;
  s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
  e = parseInt(str.substring(1, 1 + ebits), 2);
  f = parseInt(str.substring(1 + ebits), 2);

  // Produce number
  if (e === (1 << ebits) - 1) {
    return f !== 0 ? NaN : s * Infinity;
  } else if (e > 0) {
    // Normalized
    return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
  } else if (f !== 0) {
    // Denormalized
    return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
  } else {
    return s < 0 ? -0 : 0;
  }
}

function unpackF64(b) { return unpackIEEE754(b, 11, 52); }
function packF64(v) { return packIEEE754(v, 11, 52); }
function unpackF32(b) { return unpackIEEE754(b, 8, 23); }
function packF32(v) { return packIEEE754(v, 8, 23); }


//
// 3 The ArrayBuffer Type
//

(function() {

  /** @constructor */
  var ArrayBuffer = function ArrayBuffer(length) {
    length = ECMAScript.ToInt32(length);
    if (length < 0) throw new RangeError('ArrayBuffer size is not a small enough positive integer');

    this.byteLength = length;
    this._bytes = [];
    this._bytes.length = length;

    var i;
    for (i = 0; i < this.byteLength; i += 1) {
      this._bytes[i] = 0;
    }

    configureProperties(this);
  };

  exports.ArrayBuffer = exports.ArrayBuffer || ArrayBuffer;

  //
  // 4 The ArrayBufferView Type
  //

  // NOTE: this constructor is not exported
  /** @constructor */
  var ArrayBufferView = function ArrayBufferView() {
    //this.buffer = null;
    //this.byteOffset = 0;
    //this.byteLength = 0;
  };

  //
  // 5 The Typed Array View Types
  //

  function makeConstructor(bytesPerElement, pack, unpack) {
    // Each TypedArray type requires a distinct constructor instance with
    // identical logic, which this produces.

    var ctor;
    ctor = function(buffer, byteOffset, length) {
      var array, sequence, i, s;

      if (!arguments.length || typeof arguments[0] === 'number') {
        // Constructor(unsigned long length)
        this.length = ECMAScript.ToInt32(arguments[0]);
        if (length < 0) throw new RangeError('ArrayBufferView size is not a small enough positive integer');

        this.byteLength = this.length * this.BYTES_PER_ELEMENT;
        this.buffer = new ArrayBuffer(this.byteLength);
        this.byteOffset = 0;
      } else if (typeof arguments[0] === 'object' && arguments[0].constructor === ctor) {
        // Constructor(TypedArray array)
        array = arguments[0];

        this.length = array.length;
        this.byteLength = this.length * this.BYTES_PER_ELEMENT;
        this.buffer = new ArrayBuffer(this.byteLength);
        this.byteOffset = 0;

        for (i = 0; i < this.length; i += 1) {
          this._setter(i, array._getter(i));
        }
      } else if (typeof arguments[0] === 'object' &&
                 !(arguments[0] instanceof ArrayBuffer || ECMAScript.Class(arguments[0]) === 'ArrayBuffer')) {
        // Constructor(sequence<type> array)
        sequence = arguments[0];

        this.length = ECMAScript.ToUint32(sequence.length);
        this.byteLength = this.length * this.BYTES_PER_ELEMENT;
        this.buffer = new ArrayBuffer(this.byteLength);
        this.byteOffset = 0;

        for (i = 0; i < this.length; i += 1) {
          s = sequence[i];
          this._setter(i, Number(s));
        }
      } else if (typeof arguments[0] === 'object' &&
                 (arguments[0] instanceof ArrayBuffer || ECMAScript.Class(arguments[0]) === 'ArrayBuffer')) {
        // Constructor(ArrayBuffer buffer,
        //             optional unsigned long byteOffset, optional unsigned long length)
        this.buffer = buffer;

        this.byteOffset = ECMAScript.ToUint32(byteOffset);
        if (this.byteOffset > this.buffer.byteLength) {
          throw new RangeError("byteOffset out of range");
        }

        if (this.byteOffset % this.BYTES_PER_ELEMENT) {
          // The given byteOffset must be a multiple of the element
          // size of the specific type, otherwise an exception is raised.
          throw new RangeError("ArrayBuffer length minus the byteOffset is not a multiple of the element size.");
        }

        if (arguments.length < 3) {
          this.byteLength = this.buffer.byteLength - this.byteOffset;

          if (this.byteLength % this.BYTES_PER_ELEMENT) {
            throw new RangeError("length of buffer minus byteOffset not a multiple of the element size");
          }
          this.length = this.byteLength / this.BYTES_PER_ELEMENT;
        } else {
          this.length = ECMAScript.ToUint32(length);
          this.byteLength = this.length * this.BYTES_PER_ELEMENT;
        }

        if ((this.byteOffset + this.byteLength) > this.buffer.byteLength) {
          throw new RangeError("byteOffset and length reference an area beyond the end of the buffer");
        }
      } else {
        throw new TypeError("Unexpected argument type(s)");
      }

      this.constructor = ctor;

      configureProperties(this);
      makeArrayAccessors(this);
    };

    ctor.prototype = new ArrayBufferView();
    ctor.prototype.BYTES_PER_ELEMENT = bytesPerElement;
    ctor.prototype._pack = pack;
    ctor.prototype._unpack = unpack;
    ctor.BYTES_PER_ELEMENT = bytesPerElement;

    // getter type (unsigned long index);
    ctor.prototype._getter = function(index) {
      if (arguments.length < 1) throw new SyntaxError("Not enough arguments");

      index = ECMAScript.ToUint32(index);
      if (index >= this.length) {
        return undefined;
      }

      var bytes = [], i, o;
      for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT;
           i < this.BYTES_PER_ELEMENT;
           i += 1, o += 1) {
        bytes.push(this.buffer._bytes[o]);
      }
      return this._unpack(bytes);
    };

    // NONSTANDARD: convenience alias for getter: type get(unsigned long index);
    ctor.prototype.get = ctor.prototype._getter;

    // setter void (unsigned long index, type value);
    ctor.prototype._setter = function(index, value) {
      if (arguments.length < 2) throw new SyntaxError("Not enough arguments");

      index = ECMAScript.ToUint32(index);
      if (index >= this.length) {
        return undefined;
      }

      var bytes = this._pack(value), i, o;
      for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT;
           i < this.BYTES_PER_ELEMENT;
           i += 1, o += 1) {
        this.buffer._bytes[o] = bytes[i];
      }
    };

    // void set(TypedArray array, optional unsigned long offset);
    // void set(sequence<type> array, optional unsigned long offset);
    ctor.prototype.set = function(index, value) {
      if (arguments.length < 1) throw new SyntaxError("Not enough arguments");
      var array, sequence, offset, len,
          i, s, d,
          byteOffset, byteLength, tmp;

      if (typeof arguments[0] === 'object' && arguments[0].constructor === this.constructor) {
        // void set(TypedArray array, optional unsigned long offset);
        array = arguments[0];
        offset = ECMAScript.ToUint32(arguments[1]);

        if (offset + array.length > this.length) {
          throw new RangeError("Offset plus length of array is out of range");
        }

        byteOffset = this.byteOffset + offset * this.BYTES_PER_ELEMENT;
        byteLength = array.length * this.BYTES_PER_ELEMENT;

        if (array.buffer === this.buffer) {
          tmp = [];
          for (i = 0, s = array.byteOffset; i < byteLength; i += 1, s += 1) {
            tmp[i] = array.buffer._bytes[s];
          }
          for (i = 0, d = byteOffset; i < byteLength; i += 1, d += 1) {
            this.buffer._bytes[d] = tmp[i];
          }
        } else {
          for (i = 0, s = array.byteOffset, d = byteOffset;
               i < byteLength; i += 1, s += 1, d += 1) {
            this.buffer._bytes[d] = array.buffer._bytes[s];
          }
        }
      } else if (typeof arguments[0] === 'object' && typeof arguments[0].length !== 'undefined') {
        // void set(sequence<type> array, optional unsigned long offset);
        sequence = arguments[0];
        len = ECMAScript.ToUint32(sequence.length);
        offset = ECMAScript.ToUint32(arguments[1]);

        if (offset + len > this.length) {
          throw new RangeError("Offset plus length of array is out of range");
        }

        for (i = 0; i < len; i += 1) {
          s = sequence[i];
          this._setter(offset + i, Number(s));
        }
      } else {
        throw new TypeError("Unexpected argument type(s)");
      }
    };

    // TypedArray subarray(long begin, optional long end);
    ctor.prototype.subarray = function(start, end) {
      function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

      start = ECMAScript.ToInt32(start);
      end = ECMAScript.ToInt32(end);

      if (arguments.length < 1) { start = 0; }
      if (arguments.length < 2) { end = this.length; }

      if (start < 0) { start = this.length + start; }
      if (end < 0) { end = this.length + end; }

      start = clamp(start, 0, this.length);
      end = clamp(end, 0, this.length);

      var len = end - start;
      if (len < 0) {
        len = 0;
      }

      return new this.constructor(
        this.buffer, this.byteOffset + start * this.BYTES_PER_ELEMENT, len);
    };

    return ctor;
  }

  var Int8Array = makeConstructor(1, packI8, unpackI8);
  var Uint8Array = makeConstructor(1, packU8, unpackU8);
  var Uint8ClampedArray = makeConstructor(1, packU8Clamped, unpackU8);
  var Int16Array = makeConstructor(2, packI16, unpackI16);
  var Uint16Array = makeConstructor(2, packU16, unpackU16);
  var Int32Array = makeConstructor(4, packI32, unpackI32);
  var Uint32Array = makeConstructor(4, packU32, unpackU32);
  var Float32Array = makeConstructor(4, packF32, unpackF32);
  var Float64Array = makeConstructor(8, packF64, unpackF64);

  exports.Int8Array = exports.Int8Array || Int8Array;
  exports.Uint8Array = exports.Uint8Array || Uint8Array;
  exports.Uint8ClampedArray = exports.Uint8ClampedArray || Uint8ClampedArray;
  exports.Int16Array = exports.Int16Array || Int16Array;
  exports.Uint16Array = exports.Uint16Array || Uint16Array;
  exports.Int32Array = exports.Int32Array || Int32Array;
  exports.Uint32Array = exports.Uint32Array || Uint32Array;
  exports.Float32Array = exports.Float32Array || Float32Array;
  exports.Float64Array = exports.Float64Array || Float64Array;
}());

//
// 6 The DataView View Type
//

(function() {
  function r(array, index) {
    return ECMAScript.IsCallable(array.get) ? array.get(index) : array[index];
  }

  var IS_BIG_ENDIAN = (function() {
    var u16array = new(exports.Uint16Array)([0x1234]),
        u8array = new(exports.Uint8Array)(u16array.buffer);
    return r(u8array, 0) === 0x12;
  }());

  // Constructor(ArrayBuffer buffer,
  //             optional unsigned long byteOffset,
  //             optional unsigned long byteLength)
  /** @constructor */
  var DataView = function DataView(buffer, byteOffset, byteLength) {
    if (arguments.length === 0) {
      buffer = new ArrayBuffer(0);
    } else if (!(buffer instanceof ArrayBuffer || ECMAScript.Class(buffer) === 'ArrayBuffer')) {
      throw new TypeError("TypeError");
    }

    this.buffer = buffer || new ArrayBuffer(0);

    this.byteOffset = ECMAScript.ToUint32(byteOffset);
    if (this.byteOffset > this.buffer.byteLength) {
      throw new RangeError("byteOffset out of range");
    }

    if (arguments.length < 3) {
      this.byteLength = this.buffer.byteLength - this.byteOffset;
    } else {
      this.byteLength = ECMAScript.ToUint32(byteLength);
    }

    if ((this.byteOffset + this.byteLength) > this.buffer.byteLength) {
      throw new RangeError("byteOffset and length reference an area beyond the end of the buffer");
    }

    configureProperties(this);
  };

  function makeGetter(arrayType) {
    return function(byteOffset, littleEndian) {

      byteOffset = ECMAScript.ToUint32(byteOffset);

      if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength) {
        throw new RangeError("Array index out of range");
      }
      byteOffset += this.byteOffset;

      var uint8Array = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT),
          bytes = [], i;
      for (i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1) {
        bytes.push(r(uint8Array, i));
      }

      if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN)) {
        bytes.reverse();
      }

      return r(new arrayType(new Uint8Array(bytes).buffer), 0);
    };
  }

  DataView.prototype.getUint8 = makeGetter(exports.Uint8Array);
  DataView.prototype.getInt8 = makeGetter(exports.Int8Array);
  DataView.prototype.getUint16 = makeGetter(exports.Uint16Array);
  DataView.prototype.getInt16 = makeGetter(exports.Int16Array);
  DataView.prototype.getUint32 = makeGetter(exports.Uint32Array);
  DataView.prototype.getInt32 = makeGetter(exports.Int32Array);
  DataView.prototype.getFloat32 = makeGetter(exports.Float32Array);
  DataView.prototype.getFloat64 = makeGetter(exports.Float64Array);

  function makeSetter(arrayType) {
    return function(byteOffset, value, littleEndian) {

      byteOffset = ECMAScript.ToUint32(byteOffset);
      if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength) {
        throw new RangeError("Array index out of range");
      }

      // Get bytes
      var typeArray = new arrayType([value]),
          byteArray = new Uint8Array(typeArray.buffer),
          bytes = [], i, byteView;

      for (i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1) {
        bytes.push(r(byteArray, i));
      }

      // Flip if necessary
      if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN)) {
        bytes.reverse();
      }

      // Write them
      byteView = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT);
      byteView.set(bytes);
    };
  }

  DataView.prototype.setUint8 = makeSetter(exports.Uint8Array);
  DataView.prototype.setInt8 = makeSetter(exports.Int8Array);
  DataView.prototype.setUint16 = makeSetter(exports.Uint16Array);
  DataView.prototype.setInt16 = makeSetter(exports.Int16Array);
  DataView.prototype.setUint32 = makeSetter(exports.Uint32Array);
  DataView.prototype.setInt32 = makeSetter(exports.Int32Array);
  DataView.prototype.setFloat32 = makeSetter(exports.Float32Array);
  DataView.prototype.setFloat64 = makeSetter(exports.Float64Array);

  exports.DataView = exports.DataView || DataView;

}());

},{}]},{},[])
;;module.exports=require("native-buffer-browserify").Buffer

},{}],111:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],112:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],113:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return obj[k].map(function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],114:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":112,"./encode":113}],115:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],116:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":115,"__browserify_process":111,"inherits":109}]},{},[])