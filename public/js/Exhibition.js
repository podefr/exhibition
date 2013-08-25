define(function (require) {

	var Galleries = require("./uis/Galleries");

	return function Exhibition($dataProvider, $placeAt, $galleriesTemplate) {

		var _dataProvider = $dataProvider,
			_galleries = null;

		this.setDataProvider = function setDataProvider(dataProvider) {
			_dataProvider = dataProvider;
		};

		this.getDataProvider = function getDataProvider() {
			return _dataProvider;
		};

		this.start = function start() {
			this.initGalleries();
		};

		this.initGalleries = function start() {
			_galleries = new Galleries(_dataProvider.getGalleries());
			_galleries.template = $galleriesTemplate;
			_galleries.place($placeAt);
		};


	};

});