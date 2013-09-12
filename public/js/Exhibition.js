define(function (require) {

	var Collections = require("./uis/Collections"),
		Photosets = require("./uis/Photosets"),
		Collage = require("./uis/Collage"),
		LocationRouter = require("LocationRouter"),
		Navigation = require("./uis/Navigation"),
		Stack = require("Stack");

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider,
			_locationRouter = new LocationRouter(),
			_collections = null,
			_photosets = null,
			_collage = null,
			_stack = null;

		this.start = function start() {
			this.initStack();
			this.initCollections();
			this.initPhotosets();
			this.initCollage();
			//this.initNavigation();
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
			_stack.add(_collage.dom);
		};

		this.initNavigation = function initNavigation() {
			_navigation = new Navigation(_locationRouter);
			_navigation.template = document.querySelector(".navigation");
			_navigation.alive(".navigation");
		};

		_locationRouter.set("home", function () {
			_stack.transit(_collections.dom);
		});

		_locationRouter.set("photosets", function (id) {
			_photosets.setPhotosets(_dataProvider.getPhotosetsForCollection(id));
			_stack.transit(_photosets.dom);
		});

		_locationRouter.set("photoset", function (id) {
			_collage.setPhotoset(_dataProvider.getPhotosFromPhotoset(id));
			_stack.transit(_collage.dom);
		});

		_locationRouter.watch(function () {
			window.scrollTo(document.querySelector(".main"));
		});


	};

});