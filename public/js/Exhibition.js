define(function (require) {

	var Galleries = require("./uis/Galleries"),
		Collage = require("./uis/Collage"),
		LocationRouter = require("LocationRouter"),
		Navigation = require("./uis/Navigation"),
		Stack = require("Stack");

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider,
			_locationRouter = new LocationRouter(),
			_galleries = null,
			_collage = null,
			_stack = null;

		this.start = function start() {
			this.initStack();
			this.initGalleries();
			this.initCollage();
			this.initNavigation();
			// We navigate to home first, it's the initial state
			_locationRouter.navigate("home");
			// Then we start the router, if a valid route is given in the url
			// then we navigate to it.
			_locationRouter.start();
		};

		this.initStack = function initStack() {
			_stack = new Stack();
			_stack.place(document.querySelector(".main"));
		};

		this.initGalleries = function initGalleries() {
			_galleries = new Galleries(_dataProvider.getGalleries());
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
			_stack.show(_galleries.dom);
			_stack.hide(_collage.dom);
		});

		_locationRouter.set("gallery", function (id) {
			_collage.setGallery(_dataProvider.getGallery(id));
			_stack.hide(_galleries.dom);
			_stack.show(_collage.dom);
		});


	};

});