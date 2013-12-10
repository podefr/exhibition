define(function (require) {

	var Collections = require("./uis/Collections"),
		Photosets = require("./uis/Photosets"),
		Collage = require("./uis/Collage"),
		Slideshow = require("./uis/Slideshow"),
		LocationRouter = require("LocationRouter"),
		Navigation = require("./uis/Navigation"),
		Stack = require("Stack");

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider,
			_locationRouter = new LocationRouter(),
			_collections = null,
			_photosets = null,
			_collage = null,
			_slideshow = null,
			_stack = null,
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
				_locationRouter.navigate("photosets", id);
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
			_slideshow = new Slideshow();
			_slideshow.template = document.querySelector(".slideshow");
			_slideshow.render();
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

});