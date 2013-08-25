define(function (require) {

	var Galleries = require("./uis/Galleries"),
		Collage = require("./uis/Collage"),
		//navigation = require("./core/navigation"),
		Stack = require("Stack");

	return function Exhibition($dataProvider, $placeAt, $galleriesTemplate) {

		var _dataProvider = $dataProvider,
			_galleries = null,
			_collage = null,
			_stack = null;

		this.setDataProvider = function setDataProvider(dataProvider) {
			_dataProvider = dataProvider;
		};

		this.getDataProvider = function getDataProvider() {
			return _dataProvider;
		};

		this.start = function start() {
			this.initStack();
			this.initGalleries();
			this.initCollage();
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
			_galleries.watch("drillin", navigation.event, navigation);
		};

		this.initCollage = function initcollage() {
			_collage = new Collage();
			_collage.template = document.querySelector(".collage");
			_collage.render();
			_stack.add(_collage.dom);
			_stack.hide(_collage.dom);
		};


	};

});