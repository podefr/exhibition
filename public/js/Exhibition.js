define(function (require) {

	var Collections = require("./uis/Collections"),
		Galleries = require("./uis/Galleries"),
		Collage = require("./uis/Collage"),
		LocationRouter = require("LocationRouter"),
		Navigation = require("./uis/Navigation"),
		Stack = require("Stack");

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider,
			_locationRouter = new LocationRouter(),
			_collections = null,
			_galleries = null,
			_collage = null,
			_stack = null;

		this.start = function start() {
			this.initStack();
			this.initCollections();
			//this.initGalleries();
			//this.initCollage();
			//this.initNavigation();
			//_stack.hideAll();
			//_locationRouter.start("home");
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
				_locationRouter.navigate("collection", id);
			});
		};

		this.initGalleries = function initGalleries() {
			_galleries = new Galleries();
			_galleries.template = document.querySelector(".galleries");
			_galleries.render();
			_stack.add(_galleries.dom);
			_galleries.watch("drillin", function (id) {
				_locationRouter.navigate("gallery", id);
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

		_locationRouter.set("collection", function () {
			_collections
			_stack.transit(_galleries.dom);
		});

		_locationRouter.set("gallery", function (id) {
			_collage.setGallery(_dataProvider.getGallery(id));
			_stack.transit(_collage.dom);
		});


	};

});