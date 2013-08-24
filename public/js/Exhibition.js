define(function (require) {

	var Galleries = require("./uis/Galleries"),
		Store = require("Store"),
		Tools = require("Tools");

	return function Exhibition($dataProvider, $dom) {

		var _dataProvider = $dataProvider,
			_galleries = null;

		this.setDataProvider = function setDataProvider(dataProvider) {
			_dataProvider = dataProvider;
		};

		this.getDataProvider = function getDataProvider() {
			return _dataProvider;
		};

		this.start = function () {
			this.initGalleries();
		};

		this.initGalleries = function () {
			galleries = new Galleries(this.prepareGalleries());
			galleries.place($dom);
		};

		this.prepareGalleries = function () {
			var galleries = _dataProvider.getGalleries(),
				formattedGalleries = [];

			Tools.loop(galleries, function (gallery) {
				formattedGalleries.push({
					server: gallery.server,
					id: gallery.primary,
					secret: gallery.secret,
					farm: gallery.farm,
					title: gallery.title._content
				});
			});
			return new Store(formattedGalleries);
		};

	};

});