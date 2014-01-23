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
},{"./uis/Collage":7,"./uis/Collections":8,"./uis/Navigation":9,"./uis/Photosets":10,"./uis/Slideshow":11,"./uis/VideoContainer":12,"olives":35}],2:[function(require,module,exports){
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
},{"emily":28}],3:[function(require,module,exports){
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
},{}],"exhibition":[function(require,module,exports){
module.exports=require('8g7Ub6');
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
},{"./Exhibition":1,"./adapters/Flickr":2,"Emily":20,"jsonp-flickr":29}],6:[function(require,module,exports){
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
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":28,"olives":35}],8:[function(require,module,exports){
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
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":28,"olives":35}],9:[function(require,module,exports){
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
},{"emily":28,"olives":35}],10:[function(require,module,exports){
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
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":28,"olives":35}],11:[function(require,module,exports){
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
},{"../adapters/helpers":3,"../services/flickrContent":6,"emily":28,"olives":35}],12:[function(require,module,exports){
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
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

var Tools = require("./Tools");
/**
* @class
* Observable is an implementation of the Observer design pattern,
* which is also known as publish/subscribe.
*
* This service creates an Observable to which you can add subscribers.
*
* @returns {Observable}
*/
module.exports = function ObservableConstructor() {

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
            args = Tools.toArray(arguments).slice(1);

        if (observers) {
            Tools.loop(observers, function (value) {
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
},{"./Tools":18}],14:[function(require,module,exports){
/**
* Emily.js - http://flams.github.com/emily/
* Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
* MIT Licensed
*/
"use strict";

var Observable = require("./Observable"),
StateMachine = require("./StateMachine");

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
     * The state machine States & transitions
     * @private
     */
    _states = {

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
                setTimeout(function () {
                    resolver(_value);
                }, 0);
            }]],

        // When rejected
        "Rejected": [
            // We directly call the resolver with the reason
            ["toReject", function toReject(resolver) {
                setTimeout(function () {
                    resolver(_reason);
                }, 0);
            }]]
    },

    /**
     * The stateMachine
     * @private
     */
    _stateMachine = new StateMachine("Pending", _states);

    /**
     * Fulfilled the promise.
     * A promise can be fulfilld only once.
     * @param the fulfillment value
     * @returns the promise
     */
    this.fulfill = function fulfill(value) {
        _stateMachine.event("fulfill", value);
        return this;
    };

    /**
     * Reject the promise.
     * A promise can be rejected only once.
     * @param the rejection value
     * @returns true if the rejection function was called
     */
    this.reject = function reject(reason) {
        _stateMachine.event("reject", reason);
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
     * Synchronize this promise with a thenable
     * @returns {Boolean} false if the given sync is not a thenable
     */
    this.sync = function sync(syncWith) {
        if (syncWith instanceof Object && syncWith.then) {

            var onFulfilled = function onFulfilled(value) {
                this.fulfill(value);
            },
            onRejected = function onRejected(reason) {
                this.reject(reason);
            };

            syncWith.then(onFulfilled.bind(this),
                    onRejected.bind(this));

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
                if (!promise.sync(returnedPromise)) {
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
},{"./Observable":13,"./StateMachine":16}],15:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

var Observable = require("./Observable"),
    Store = require("./Store"),
    Tools = require("./Tools");

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
    _history = new Store([]),

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
    this.navigate = function get(route, params) {
        if (this.load.apply(this, arguments)) {
            // Before adding a new route to the history, we must clear the forward history
            _history.proxy("splice", _currentPos +1, _history.count());
            _history.proxy("push", Tools.toArray(arguments));
            this.ensureMaxHistory(_history);
            _currentPos = _history.count() -1;
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
        var count = history.count(),
            max = this.getMaxHistory(),
            excess = count - max;

        if (excess > 0) {
            history.proxy("splice", 0, excess);
        }
    };

    /**
     * Actually loads the route
     * @private
     */
    this.load = function load() {
        var copy = Tools.toArray(arguments);

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
        return _history.count();
    };

    /**
     * Flush the entire history
     */
    this.clearHistory = function clearHistory() {
        _history.reset([]);
    };

    /**
     * Go back and forth in the history
     * @param {Number} nb the amount of history to rewind/forward
     * @returns true if history exists
     */
    this.go = function go(nb) {
        var history = _history.get(_currentPos + nb);
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
},{"./Observable":13,"./Store":17,"./Tools":18}],16:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

var Tools = require("./Tools");

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

        nextState = _states[_currentState].event.apply(_states[_currentState].event, Tools.toArray(arguments));
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
    Tools.loop($diagram, function (transition, state) {
        var myState = this.add(state);
        transition.forEach(function (params){
            myState.add.apply(null, params);
        });
    }, this);

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
            _transition[0].apply(_transition[1], Tools.toArray(arguments).slice(1));
            return _transition[2];
        } else {
            return false;
        }
    };
}
},{"./Tools":18}],17:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

var Observable = require("./Observable"),
    Tools = require("./Tools");

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
    var _data = Tools.clone($data) || {},

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
        var diffs = Tools.objectsDiffs(previousData, _data);
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
    this.getNbItems = function() {
        return _data instanceof Array ? _data.length : Tools.count(_data);
    };

    /**
     * Count is an alias for getNbItems
     * @returns {Number} the number of items in the store
     */
    this.count = this.getNbItems;

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
            Tools.setNestedProperty(item, property, value);
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
        if (this.has(name)) {
            if (!this.alter("splice", name, 1)) {
                delete _data[name];
                _storeObservable.notify("deleted", name);
                _valueObservable.notify(name, _data[name], "deleted");
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
        if (indexes instanceof Array) {
            // Indexes must be removed from the greatest to the lowest
            // To avoid trying to remove indexes that don't exist.
            // i.e: given [0, 1, 2], remove 1, then 2, 2 doesn't exist anymore
            indexes.sort(Tools.compareNumbers)
                .reverse()
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
            previousData = Tools.clone(_data);
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
        Tools.loop(_data, func, scope);
    };

    /**
     * Reset all data and get notifications on changes
     * @param {Arra/Object} data the new data
     * @returns {Boolean}
     */
    this.reset = function reset(data) {
        if (data instanceof Object) {
            var previousData = Tools.clone(_data);
            _data = Tools.clone(data) || {};
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

            Tools.loop(computeFrom, function (property) {
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
            Tools.loop(_computed[name], function (handle) {
                this.unwatchValue(handle);
            }, this);
            this.del(name);
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
},{"./Observable":13,"./Tools":18}],18:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2013 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";

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

    if (!array) {
        return;
    }

    array.forEach(function (comparedItem, comparedItemIndex) {
        var thisDiff = getDiff(comparedItem, item);

        if (thisDiff >= 0 && (typeof diff == "undefined" || thisDiff < diff)) {
            diff = thisDiff;
            closest = comparedItemIndex;
        }
    });

    return closest;
}

/**
* @class
* Tools is a collection of tools
*/
module.exports = {
    /**
     * For applications that don't run in a browser, window is not the global object.
     * This function returns the global object wherever the application runs.
     * @returns {Object} the global object
     */
    getGlobal: function getGlobal() {
        return Function('return this')();
    },

    /**
     * Mixes an object into another
     * @param {Object} source object to get values from
     * @param {Object} destination object to mix values into
     * @param {Boolean} optional, set to true to prevent overriding
     * @returns {Object} the destination object
     */
    mixin: function mixin(source, destination, dontOverride) {
        this.loop(source, function (value, idx) {
            if (!destination[idx] || !dontOverride) {
                destination[idx] = source[idx];
            }
        });
        return destination;
    },

    /**
     * Count the number of properties in an object
     * It doesn't look up in the prototype chain
     * @param {Object} object the object to count
     * @returns {Number}
     */
    count: function count(object) {
        var nbItems = 0;
        this.loop(object, function () {
            nbItems++;
        });

        return nbItems;
    },

    /**
     * Compares the properties of two objects and returns true if they're the same
     * It's doesn't do it recursively
     * @param {Object} first object
     * @param {Object} second object
     * @returns {Boolean} true if the two objets have the same properties
     */
    compareObjects: function compareObjects(object1, object2) {
        var getOwnProperties = function (object) {
            return Object.getOwnPropertyNames(object).sort().join("");
        };
        return getOwnProperties(object1) == getOwnProperties(object2);
    },

    /**
     * Compares two numbers and tells if the first one is bigger (1), smaller (-1) or equal (0)
     * @param {Number} number1 the first number
     * @param {Number} number2 the second number
     * @returns 1 if number1>number2, -1 if number2>number1, 0 if equal
     */
    compareNumbers: function compareNumbers(number1, number2) {
          if (number1>number2) {
            return 1;
          } else if (number1<number2) {
            return -1;
          } else {
             return 0;
          }
    },

    /**
     * Transform array-like objects to array, such as nodeLists or arguments
     * @param {Array-like object}
     * @returns {Array}
     */
    toArray: function toArray(array) {
        return [].slice.call(array);
    },

    /**
     * Small adapter for looping over objects and arrays
     * Warning: it's not meant to be used with nodeList
     * To use with nodeList, convert to array first
     * @param {Array/Object} iterated the array or object to loop through
     * @param {Function} callback the function to execute for each iteration
     * @param {Object} scope the scope in which to execute the callback
     * @returns {Boolean} true if executed
     */
    loop: function loop(iterated, callback, scope) {
        var i,
            length;

        if (iterated instanceof Object && callback instanceof Function) {
            if (iterated instanceof Array) {
                for (i=0; i<iterated.length; i++) {
                    callback.call(scope, iterated[i], i, iterated);
                }
            } else {
                for (i in iterated) {
                    if (iterated.hasOwnProperty(i)) {
                        callback.call(scope, iterated[i], i, iterated);
                    }
                }
            }
            return true;
        } else {
            return false;
        }
    },

    /**
     * Make a diff between two objects
     * @param {Array/Object} before is the object as it was before
     * @param {Array/Object} after is what it is now
     * @example:
     *  With objects:
     *
     *  before = {a:1, b:2, c:3, d:4, f:6}
     *  after = {a:1, b:20, d: 4, e: 5}
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
     *  before = [10, 20, 30]
     *  after = [15, 20]
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
    objectsDiffs : function objectsDiffs(before, after) {
        if (before instanceof Object && after instanceof Object) {
            var unchanged = [],
                updated = [],
                deleted = [],
                added = [];

             // Look through the after object
             this.loop(after, function (value, idx) {

                 // To get the added
                 if (typeof before[idx] == "undefined") {
                     added.push(idx);

                 // The updated
                 } else if (value !== before[idx]) {
                     updated.push(idx);

                 // And the unchanged
                 } else if (value === before[idx]) {
                     unchanged.push(idx);
                 }

             });

             // Loop through the before object
             this.loop(before, function (value, idx) {

                // To get the deleted
                if (typeof after[idx] == "undefined") {
                    deleted.push(idx);
                }
             });

            return {
                updated: updated,
                unchanged: unchanged,
                added: added,
                deleted: deleted
            };

        } else {
            return false;
        }
    },

    /**
     * Transforms Arrays and Objects into valid JSON
     * @param {Object/Array} object the object to JSONify
     * @returns the JSONified object or false if failed
     */
    jsonify: function jsonify(object) {
        if (object instanceof Object) {
            return JSON.parse(JSON.stringify(object));
        } else {
            return false;
        }
    },

    /**
     * Clone an Array or an Object
     * @param {Array/Object} object the object to clone
     * @returns {Array/Object} the cloned object
     */
    clone: function clone(object) {
        if (object instanceof Array) {
            return object.slice(0);
        } else if (typeof object == "object" && object !== null && !(object instanceof RegExp)) {
            return this.mixin(object, {});
        } else {
            return false;
        }
    },


    /**
     *
     *
     *
     *
     * Refactoring needed for the following
     *
     *
     *
     *
     *
     */

    /**
     * Get the property of an object nested in one or more objects
     * given an object such as a.b.c.d = 5, getNestedProperty(a, "b.c.d") will return 5.
     * @param {Object} object the object to get the property from
     * @param {String} property the path to the property as a string
     * @returns the object or the the property value if found
     */
    getNestedProperty: function getNestedProperty(object, property) {
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
    },

    /**
     * Set the property of an object nested in one or more objects
     * If the property doesn't exist, it gets created.
     * @param {Object} object
     * @param {String} property
     * @param value the value to set
     * @returns object if no assignment was made or the value if the assignment was made
     */
    setNestedProperty: function setNestedProperty(object, property, value) {
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
    },

    /**
     * Get the closest number in an array given a base number
     * Example: closest(30, [20, 0, 50, 29]) will return 3 as 29 is the closest item
     * @param {Number} item the base number
     * @param {Array} array the array of numbers to search into
     * @returns {Number} the index of the closest item in the array
     */
    closest: function closest(item, array) {
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
    closestGreater: function closestGreater(item, array) {
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
    closestLower: function closestLower(item, array) {
        return _getClosest(item, array, function (comparedItem, item) {
            return item - comparedItem;
        });
    }
};
},{}],19:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
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
        if (reqHandlers instanceof Object) {
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
        if (_reqHandlers.has(reqHandler) &&
            typeof data != "undefined" &&
            typeof callback == "function") {

            var func = function () {
                callback.apply(scope, arguments);
            },
            abort;

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
},{}],20:[function(require,module,exports){
/**
 * Emily.js - http://flams.github.com/emily/
 * Copyright(c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
module.exports = {
    Observable: require("./Observable"),
    Promise: require("./Promise"),
    Router: require("./Router"),
    StateMachine: require("./StateMachine"),
    Store: require("./Store"),
    Tools: require("./Tools"),
    Transport: require("./Transport")
};
},{"./Observable":13,"./Promise":14,"./Router":15,"./StateMachine":16,"./Store":17,"./Tools":18,"./Transport":19}],21:[function(require,module,exports){
module.exports=require(13)
},{"./Tools":26}],22:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"./Observable":21,"./StateMachine":24}],23:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"./Observable":21,"./Store":25,"./Tools":26}],24:[function(require,module,exports){
module.exports=require(16)
},{"./Tools":26}],25:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./Observable":21,"./Tools":26}],26:[function(require,module,exports){
module.exports=require(18)
},{}],27:[function(require,module,exports){
module.exports=require(19)
},{}],28:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./Observable":21,"./Promise":22,"./Router":23,"./StateMachine":24,"./Store":25,"./Tools":26,"./Transport":27}],29:[function(require,module,exports){
/**
 * jsonp-flickr.js - https://github.com/podefr/jsonp-flickr
 * Copyright(c) 2014 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";var DEFAULT_URL="http://ycpi.api.flickr.com/services/rest/";var DEFAULT_CALLBACKNAME="jsoncallback";var Jsonp=require("jsonp-utils");module.exports=new Jsonp({url:DEFAULT_URL,callbackName:DEFAULT_CALLBACKNAME});
},{"jsonp-utils":30}],30:[function(require,module,exports){
/**
 * jsonp.js - https://github.com/podefr/jsonp
 * Copyright(c) 2013 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";var scriptUtils=require("script-utils"),uuidGenerator=require("uuid"),querystring=require("querystring"),vow=require("vow");module.exports=function Jsonp(params){params=params||{};var _timeout=params.timeout||15e3,_callbackName=params.callbackName||"callback",_url=params.url||"",_timers={};this.getTimeout=function getTimeout(){return _timeout};this.setTimeout=function setTimeout(timeout){_timeout=timeout};this.setCallbackName=function setCallbackName(callbackName){_callbackName=callbackName};this.getCallbackName=function getCallbackName(){return _callbackName};this.setUrl=function setUrl(url){_url=url};this.getUrl=function getUrl(){return _url};this.get=function get(options,callback,scope){var uuid=getUniqueId(),deferred=vow.defer(),serializedOptions=serializeOptions(addCallbackName(options,uuid)),script=scriptUtils.create(prepareUrl(_url,serializedOptions),function(){scriptUtils.remove(script)});createUniqueCallback(uuid,callback,scope,deferred);scriptUtils.append(script);startTimer(uuid,script,callback,scope,deferred);return deferred.promise()};function startTimer(uuid,script,callback,scope,deferred){_timers[uuid]=setTimeout(function(){var error=new Error("Timeout after "+_timeout+" ms");callback&&callback.call(scope,error);deferred.reject(error);delete window[uuid];scriptUtils.remove(script)},_timeout)}function clearTimer(uuid){clearTimeout(_timers[uuid])}function getUniqueId(){return"_jsonp_"+uuidGenerator.v4().replace(/-/g,"")}function addCallbackName(options,uuid){options[_callbackName]=uuid;return options}function serializeOptions(options){return querystring.stringify(options)}function prepareUrl(url,options){return url+"?"+options}function createUniqueCallback(uuid,callback,scope,deferred){window[uuid]=function(){callback&&callback.apply(scope,[null].concat([].slice.call(arguments)));deferred.resolve.apply(deferred,arguments);clearTimer(uuid);delete window[uuid]}}};
},{"querystring":51,"script-utils":31,"uuid":33,"vow":34}],31:[function(require,module,exports){
/**
 * script.js - https://github.com/podefr/script
 * Copyright(c) 2013 Olivier Scherrer <pode.fr@gmail.com>
 * MIT Licensed
 */
"use strict";module.exports={append:function append(script){document.querySelector("head").appendChild(script)},remove:function remove(script){script.parentElement.removeChild(script)},create:function create(src,callback,scope){var script=document.createElement("script");script.src=src;script.addEventListener("load",function(){callback.apply(scope,arguments)},true);return script}};
},{}],32:[function(require,module,exports){
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


},{}],33:[function(require,module,exports){
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

},{"./rng":32,"__browserify_Buffer":47}],34:[function(require,module,exports){
var process=require("__browserify_process");/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.0
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
    FULFILLED : 1,
    REJECTED  : -1
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

    _resolve : function(val) {
        if(this._status !== PROMISE_STATUS.PENDING) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        if(isVowPromise(val)) { // shortpath for vow.Promise
            val.then(
                this._resolve,
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
        if(this._status !== PROMISE_STATUS.PENDING) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status !== PROMISE_STATUS.PENDING) {
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

        if(this._status === PROMISE_STATUS.PENDING) {
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
     * @param {Array|Object} iterable
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
        return isVowPromise(value)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If given `value` is not an instance of `vow.Promise`, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return isVowPromise(value)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If given `value` is not an instance of `vow.Promise`, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return isVowPromise(value)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If given `value` is not a promise, then `value` is equivalent to fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return isVowPromise(value)? value.isResolved() : true;
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
        return vow.when(value, null, function(reason) {
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
        return vow.when(reason, function(val) {
            throw val;
        });
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
        try {
            return vow.resolve(fn.apply(global, slice.call(arguments, 1)));
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

        var i = len,
            onFulfilled = function() {
                if(!--i) {
                    var j = 0;
                    while(j < len) {
                        res[keys[j]] = vow.valueOf(iterable[keys[j++]]);
                    }
                    defer.resolve(res);
                }
            },
            onRejected = function(reason) {
                defer.reject(reason);
            };

        vow._forEach(iterable, onFulfilled, onRejected, keys);

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

        var onProgress = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(iterable, onProgress, onProgress, keys);

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

        var i = 0, reason,
            onFulfilled = function(val) {
                defer.resolve(val);
            },
            onRejected = function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            };

        vow._forEach(iterable, onFulfilled, onRejected);

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
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

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

    _forEach : function(promises, onFulfilled, onRejected, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;
        while(i < len) {
            vow.when(promises[keys? keys[i] : i], onFulfilled, onRejected);
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
    isVowPromise = function(obj) {
        return obj instanceof Promise;
    },
    slice = Array.prototype.slice,
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

},{"__browserify_process":48}],35:[function(require,module,exports){
/**
 * @license Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2013 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
var olives = require("./src/olives"),
	isConnected = false;

olives.registerSocketIO = function (io, handlers) {

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

module.exports = olives;



},{"./src/olives":46}],36:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";


var Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
    DomUtils = require("./DomUtils");

/**
 * @class
 * This plugin links dom nodes to a model
 * @requires Store, Observable, Tools, DomUtils
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
        if (model instanceof Store) {
            // Set the model
            _model = model;
            return true;
        } else {
            return false;
        }
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
            if (DomUtils.isAcceptedType(rootNode)) {
                _rootNode = rootNode;
                renderer = _rootNode.querySelector("*");
                this.setRenderer(renderer);
                if (renderer) {
                    _rootNode.removeChild(renderer);
                }
                return true;
            } else {
                return false;
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
                closest = Tools.closestGreater(id, keys),
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
                nodes = DomUtils.getNodes(newNode);

                Tools.toArray(nodes).forEach(function (child) {
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
            var _tmpNb = _nb == "*" ? _model.getNbItems() : _nb;

            // This will store the items to remove
            var marked = [];

            // Render only if boundaries have been set
            if (_nb !== null && _start !== null) {

                // Loop through the existing items
                Tools.loop(this.items, function (value, idx) {
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
                marked.sort(Tools.compareNumbers).reverse().forEach(this.removeItem, this);

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

        this.setPlugins($plugins);
        this.setRootNode($rootNode);
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
        get =  Tools.getNestedProperty(_model.get(modelIdx), prop),

        // When calling bind like bind:newBinding,param1, param2... we need to get them
        extraParam = Tools.toArray(arguments).slice(3);

        // 0 and false are acceptable falsy values
        if (get || get === 0 || get === false) {
            // If the binding hasn't been overriden
            if (!this.execBinding.apply(this,
                    [node, property, get]
                // Extra params are passed to the new binding too
                    .concat(extraParam))) {
                // Execute the default one which is a simple assignation
                //node[property] = get;
                DomUtils.setAttribute(node, property, get);
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
                    [node, property, Tools.getNestedProperty(value, prop)]
                    // passing extra params too
                    .concat(extraParam))) {
                //node[property] = Tools.getNestedProperty(value, prop);
                DomUtils.setAttribute(node, property, Tools.getNestedProperty(value, prop));
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
        if (DomUtils.isAcceptedType(node) && node.name) {
            _model.set(node.name, node.value);
            return true;
        } else {
            return false;
        }
    };

    this.getItemIndex = function getElementId(dom) {
        var dataset = DomUtils.getDataset(dom);

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
                Tools.toArray(DOMform.querySelectorAll("[name]")).forEach(that.set, that);
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
        return Tools.loop(list, function (binding, name) {
            this.addBinding(name, binding);
        }, this);
    };

    // Inits the model
    this.setModel($model);
    // Inits bindings
    this.addBindings($bindings);
};

},{"./DomUtils":37,"emily":28}],37:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var Tools = require("emily").Tools;

module.exports = {
    /**
     * Returns a NodeList including the given dom node,
     * its childNodes and its siblingNodes
     * @param {HTMLElement|SVGElement} dom the dom node to start with
     * @param {String} query an optional CSS selector to narrow down the query
     * @returns the list of nodes
     */
    getNodes: function getNodes(dom, query) {
        if (this.isAcceptedType(dom)) {
            if (!dom.parentNode) {
                document.createDocumentFragment().appendChild(dom);
            }

            return dom.parentNode.querySelectorAll(query || "*");
        } else {
            return false;
        }
    },

    /**
     * Get a domNode's dataset attribute. If dataset doesn't exist (IE)
     * then the domNode is looped through to collect them.
     * @param {HTMLElement|SVGElement} dom
     * @returns {Object} dataset
     */
    getDataset: function getDataset(dom) {
        var i=0,
            l,
            dataset={},
            split,
            join;

        if (this.isAcceptedType(dom)) {
            if (dom.hasOwnProperty("dataset")) {
                return dom.dataset;
            } else {
                for (l=dom.attributes.length;i<l;i++) {
                    split = dom.attributes[i].name.split("-");
                    if (split.shift() == "data") {
                        dataset[join = split.join("-")] = dom.getAttribute("data-"+join);
                    }
                }
                return dataset;
            }

        } else {
            return false;
        }
    },

    /**
     * Olives can manipulate HTMLElement and SVGElements
     * This function tells if an element is one of them
     * @param {Element} type
     * @returns true if HTMLElement or SVGElement
     */
    isAcceptedType: function isAcceptedType(type) {
        if (type instanceof HTMLElement ||
            type instanceof SVGElement) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Assign a new value to an Element's property. Works with HTMLElement and SVGElement.
     * @param {HTMLElement|SVGElement} node the node which property should be changed
     * @param {String} property the name of the property
     * @param {any} value the value to set
     * @returns true if assigned
     */
    setAttribute: function setAttribute(node, property, value) {
            if (node instanceof HTMLElement) {
                node[property] = value;
                return true;
            } else if (node instanceof SVGElement){
                node.setAttribute(property, value);
                return true;
            } else {
                return false;
            }
    },

    /**
     * Determine if an element matches a certain CSS selector.
     * @param {Element} the parent node
     * @param {String} CSS selector
     * @param {Element} the node to check out
     * @param true if matches
     */
    matches : function matches(parent, selector, node){
        return Tools.toArray(this.getNodes(parent, selector)).indexOf(node) > -1;
    }
};
},{"emily":28}],38:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var DomUtils = require("./DomUtils");

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
            if (DomUtils.matches(node, selector, event.target)) {
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
},{"./DomUtils":37}],39:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var Store = require("emily").Store,
    Tools = require("emily").Tools;

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
    _localStorage = localStorage,

    /**
     * Saves the current values in localStorage
     * @private
     */
    setLocalStorage = function setLocalStorage() {
        _localStorage.setItem(_name, this.toJSON());
    };

    /**
     * Override default localStorage with a new one
     * @param local$torage the new localStorage
     * @returns {Boolean} true if success
     * @private
     */
    this.setLocalStorage = function setLocalStorage(local$torage) {
        if (local$torage && local$torage.setItem instanceof Function) {
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

            Tools.loop(json, function (value, idx) {
                if (!this.has(idx)) {
                    this.set(idx, value);
                }
            }, this);

            setLocalStorage.call(this);

            // Watch for modifications to update localStorage
            this.watch("added", setLocalStorage, this);
            this.watch("updated", setLocalStorage, this);
            this.watch("deleted", setLocalStorage, this);
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
},{"emily":28}],40:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var Router = require("emily").Router,
    Tools = require("emily").Tools;

/**
 * @class
 * A locationRouter is a router which navigates to the route defined in the URL and updates this URL
 * while navigating. It's a subtype of Emily's Router
 */
function LocationRouterConstructor() {

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
        if (window.location.hash) {
            var parsedHash = this.parse(window.location.hash);
            this.navigate.apply(this, parsedHash);
        } else {
            this.navigate(_defaultRoute);
        }
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
        window.location.hash = this.toUrl(Tools.toArray(arguments));
        _lastRoute = window.location.hash;
    };

    this.getLastRoute = function getLastRoute() {
        return _lastRoute;
    };

}

module.exports = function LocationRouterFactory() {
    LocationRouterConstructor.prototype = new Router();
    return new LocationRouterConstructor();
};

},{"emily":28}],41:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var StateMachine = require("emily").StateMachine,
    Store = require("emily").Store,
    Plugins = require("./Plugins"),
    DomUtils = require("./DomUtils"),
    Tools = require("emily").Tools;

/**
* @class
* OObject is a container for dom elements. It will also bind
* the dom to additional plugins like Data binding
* @requires StateMachine
*/
module.exports = function OObjectConstructor(otherStore) {

    /**
     * This function creates the dom of the UI from its template
     * It then queries the dom for data- attributes
     * It can't be executed if the template is not set
     * @private
     */
    var render = function render(UI) {

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
            } else if (DomUtils.isAcceptedType(UI.template)) {
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

            UI.plugins.apply(UI.dom);

        } else {
            // An explicit message I hope
            throw new Error("UI.template must be set prior to render");
        }
    },

    /**
     * This function appends the dom tree to the given dom node.
     * This dom node should be somewhere in the dom of the application
     * @private
     */
    place = function place(UI, DOMplace, beforeNode) {
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
    },

    /**
     * Does rendering & placing in one function
     * @private
     */
    renderNPlace = function renderNPlace(UI, dom) {
        render(UI);
        place.apply(null, Tools.toArray(arguments));
    },

    /**
     * This stores the current place
     * If this is set, this is the place where new templates
     * will be appended
     * @private
     */
    _currentPlace = null,

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
     * The UI's Store
     * It has set/get/del/has/watch/unwatch methods
     * @see Emily's doc for more info on how it works.
     */
    this.model = otherStore instanceof Store ? otherStore : new Store();

    /**
     * The module that will manage the plugins for this UI
     * @see Olives/Plugins' doc for more info on how it works.
     */
    this.plugins = new Plugins();

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
        if (DomUtils.isAcceptedType(dom)) {
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
        if (DomUtils.isAcceptedType(dom)) {
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
},{"./DomUtils":37,"./Plugins":43,"emily":28}],42:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var OObject = require("./OObject"),
    Tools = require("emily").Tools;

/**
* @class
* Place plugin places OObject in the DOM.
* @requires OObject, Tools
*/

/**
 * Intilialize a Place.plugin with a list of OObjects
 * @param {Object} $uis a list of OObjects such as:
 *   {
 *      "header": new OObject(),
 *      "list": new OObject()
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
     * Attach an OObject to this DOM element
     * @param {HTML|SVGElement} node the dom node where to attach the OObject
     * @param {String} the name of the OObject to attach
     * @throws {NoSuchOObject} an error if there's no OObject for the given name
     */
    this.place = function place(node, name) {
        if (_uis[name] instanceof OObject) {
            _uis[name].place(node);
        } else {
            throw new Error(name + " is not an OObject UI in place:"+name);
        }
    };

    /**
     * Add an OObject that can be attached to a dom element
     * @param {String} the name of the OObject to add to the list
     * @param {OObject} ui the OObject to add the list
     * @returns {Boolean} true if the OObject was added
     */
    this.set = function set(name, ui) {
        if (typeof name == "string" && ui instanceof OObject) {
            _uis[name] = ui;
            return true;
        } else {
            return false;
        }
    };

    /**
     * Add multiple dom elements at once
     * @param {Object} $uis a list of OObjects such as:
     *   {
     *      "header": new OObject(),
     *      "list": new OObject()
     *   }
     */
    this.setAll = function setAll(uis) {
        Tools.loop(uis, function (ui, name) {
            this.set(name, ui);
        }, this);
    };

    /**
     * Returns an OObject from the list given its name
     * @param {String} the name of the OObject to get
     * @returns {OObject} OObject for the given name
     */
    this.get = function get(name) {
        return _uis[name];
    };

    this.setAll($uis);

};
},{"./OObject":41,"emily":28}],43:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var Tools = require("emily").Tools,
    DomUtils = require("./DomUtils");

/**
 * @class
 * Plugins is the link between the UI and your plugins.
 * You can design your own plugin, declare them in your UI, and call them
 * from the template, like :
 * <tag data-yourPlugin="method: param"></tag>
 * @see Model-Plugin for instance
 * @requires Tools
 */
module.exports = function PluginsConstructor($plugins) {

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
        var that = this,
            propertyName = "plugins";

        if (typeof name == "string" && typeof plugin == "object" && plugin) {
            _plugins[name] = plugin;

            plugin[propertyName] = {
                    name: name,
                    apply: function apply() {
                        return that.apply.apply(that, arguments);
                    }
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
        return Tools.loop(list, function (plugin, name) {
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

        var nodes;

        if (DomUtils.isAcceptedType(dom)) {

            nodes = DomUtils.getNodes(dom);
            Tools.loop(Tools.toArray(nodes), function (node) {
                Tools.loop(DomUtils.getDataset(node), function (phrase, plugin) {
                    applyPlugin(node, phrase, plugin);
                });
            });

            return dom;

        } else {
            return false;
        }
    };

    this.addAll($plugins);

};
},{"./DomUtils":37,"emily":28}],44:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

/**
 * @class
 * SocketIOTransport allows for client-server eventing.
 * It's based on socket.io.
 */

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
},{}],45:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
"use strict";

var Tools = require("emily").Tools;
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
		if (!this.has(dom) && dom instanceof HTMLElement) {
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
		if (newParentDom instanceof HTMLElement) {
			[].slice.call(_parent.childNodes).forEach(function (childDom) {
				if (this.has(childDom)) {
					newParentDom.appendChild(childDom);
				}
			}, this);
			return this._setParent(newParentDom);
		} else {
			return false;
		}
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
		if (Tools.toArray(_parent.childNodes).indexOf(nextElement) == -1) {
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
		if (!this.has(dom) && dom instanceof HTMLElement) {
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
	this.getParent = function _getParent() {
			return _parent;
	};

	/**
	 * Set the parent element (without appending the stacks dom elements to)
	 * @private
	 */
	this._setParent = function _setParent(parent) {
		if (parent instanceof HTMLElement) {
			_parent = parent;
			return _parent;
		} else {
			return false;
		}
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
		if (hidePlace instanceof HTMLElement) {
			_hidePlace = hidePlace;
			return true;
		} else {
			return false;
		}
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

	this._setParent($parent);

};
},{"emily":28}],46:[function(require,module,exports){
/**
 * Olives http://flams.github.com/olives
 * The MIT License (MIT)
 * Copyright (c) 2012-2014 Olivier Scherrer <pode.fr@gmail.com> - Olivier Wietrich <olivier.wietrich@gmail.com>
 */
 "use strict";

module.exports = {
	"Bind.plugin": require("./Bind.plugin"),
	"DomUtils": require("./DomUtils"),
	"Event.plugin": require("./Event.plugin"),
	"LocalStore": require("./LocalStore"),
	"LocationRouter": require("./LocationRouter"),
	"OObject": require("./OObject"),
	"Place.plugin": require("./Place.plugin"),
	"Plugins": require("./Plugins"),
	"SocketIOTransport": require("./SocketIOTransport"),
	"Stack": require("./Stack")
};
},{"./Bind.plugin":36,"./DomUtils":37,"./Event.plugin":38,"./LocalStore":39,"./LocationRouter":40,"./OObject":41,"./Place.plugin":42,"./Plugins":43,"./SocketIOTransport":44,"./Stack":45}],47:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"PcZj9L":[function(require,module,exports){
var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `browserSupport`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
var browserSupport = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
   if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined' ||
        typeof DataView === 'undefined')
      return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Relevant Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo()
  } catch (e) {
    return false
  }
})()


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
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
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

  var buf
  if (browserSupport) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return this instance of Buffer
    buf = this
    buf.length = length
  }

  var i
  if (Buffer.isBuffer(subject)) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf.set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !browserSupport && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
      return true

    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
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
  if (!isArray(list)) {
    throw new Error('Usage: Buffer.concat(list, [totalLength])\n' +
        'list should be an Array.')
  }

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

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

Buffer.prototype.write = function (string, offset, length, encoding) {
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

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

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

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
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
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
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
Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (browserSupport) {
    return augment(this.subarray(start, end))
  } else {
    // TODO: slicing works, with limitations (no parent tracking/update)
    // https://github.com/feross/native-buffer-browserify/issues/9
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
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
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 < len) {
      return buf._dataview.getUint16(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getUint16(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      val = buf[offset]
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
    } else {
      val = buf[offset] << 8
      if (offset + 1 < len)
        val |= buf[offset + 1]
    }
    return val
  }
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 < len) {
      return buf._dataview.getUint32(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getUint32(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      if (offset + 2 < len)
        val = buf[offset + 2] << 16
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
      val |= buf[offset]
      if (offset + 3 < len)
        val = val + (buf[offset + 3] << 24 >>> 0)
    } else {
      if (offset + 1 < len)
        val = buf[offset + 1] << 16
      if (offset + 2 < len)
        val |= buf[offset + 2] << 8
      if (offset + 3 < len)
        val |= buf[offset + 3]
      val = val + (buf[offset] << 24 >>> 0)
    }
    return val
  }
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    return buf._dataview.getInt8(offset)
  } else {
    var neg = buf[offset] & 0x80
    if (neg)
      return (0xff - buf[offset] + 1) * -1
    else
      return buf[offset]
  }
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getInt16(0, littleEndian)
    } else {
      return buf._dataview.getInt16(offset, littleEndian)
    }
  } else {
    var val = _readUInt16(buf, offset, littleEndian, true)
    var neg = val & 0x8000
    if (neg)
      return (0xffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getInt32(0, littleEndian)
    } else {
      return buf._dataview.getInt32(offset, littleEndian)
    }
  } else {
    var val = _readUInt32(buf, offset, littleEndian, true)
    var neg = val & 0x80000000
    if (neg)
      return (0xffffffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat32(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat64(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
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
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setUint16(offset, value, littleEndian)
    }
  } else {
    for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
      buf[offset + i] =
          (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
              (littleEndian ? i : 1 - i) * 8
    }
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  var i
  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setUint32(0, value, littleEndian)
      for (i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setUint32(offset, value, littleEndian)
    }
  } else {
    for (i = 0, j = Math.min(len - offset, 4); i < j; i++) {
      buf[offset + i] =
          (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
    }
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    buf._dataview.setInt8(offset, value)
  } else {
    if (value >= 0)
      buf.writeUInt8(value, offset, noAssert)
    else
      buf.writeUInt8(0xff + value + 1, offset, noAssert)
  }
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setInt16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setInt16(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt16(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setInt32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setInt32(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt32(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setFloat32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat32(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 7 >= len) {
      var dv = new DataView(new ArrayBuffer(8))
      dv.setFloat64(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat64(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
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

Buffer.prototype.inspect = function () {
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

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Not added to Buffer.prototype since it should only
 * be available in browsers that support ArrayBuffer.
 */
function BufferToArrayBuffer () {
  return (new Buffer(this)).buffer
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

function augment (arr) {
  arr._isBuffer = true

  // Augment the Uint8Array *instance* (not the class!) with Buffer methods
  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BufferToArrayBuffer

  if (arr.byteLength !== 0)
    arr._dataview = new DataView(arr.buffer, arr.byteOffset, arr.byteLength)

  return arr
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

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
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
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
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
 */
function verifuint (value, max) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value >= 0,
      'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":3,"ieee754":4}],"native-buffer-browserify":[function(require,module,exports){
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
		placeHolders = indexOf(b64, '=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 18) | (indexOf(lookup, b64.charAt(i + 1)) << 12) | (indexOf(lookup, b64.charAt(i + 2)) << 6) | indexOf(lookup, b64.charAt(i + 3));
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 2) | (indexOf(lookup, b64.charAt(i + 1)) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 10) | (indexOf(lookup, b64.charAt(i + 1)) << 4) | (indexOf(lookup, b64.charAt(i + 2)) >> 2);
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
			return lookup.charAt(num >> 18 & 0x3F) + lookup.charAt(num >> 12 & 0x3F) + lookup.charAt(num >> 6 & 0x3F) + lookup.charAt(num & 0x3F);
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
				output += lookup.charAt(temp >> 2);
				output += lookup.charAt((temp << 4) & 0x3F);
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup.charAt(temp >> 10);
				output += lookup.charAt((temp >> 4) & 0x3F);
				output += lookup.charAt((temp << 2) & 0x3F);
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

function indexOf (arr, elt /*, from*/) {
	var len = arr.length;

	var from = Number(arguments[1]) || 0;
	from = (from < 0)
		? Math.ceil(from)
		: Math.floor(from);
	if (from < 0)
		from += len;

	for (; from < len; from++) {
		if ((typeof arr === 'string' && arr.charAt(from) === elt) ||
				(typeof arr !== 'string' && arr[from] === elt)) {
			return from;
		}
	}
	return -1;
}

},{}],4:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}]},{},[])
;;module.exports=require("native-buffer-browserify").Buffer

},{}],48:[function(require,module,exports){
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
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
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

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":49,"./encode":50}]},{},[])