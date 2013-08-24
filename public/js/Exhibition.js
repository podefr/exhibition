define(function (require) {

	var Galleries = require("js/uis/Galleries");

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider;

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
			console.log(_dataProvider.getGalleries());
		}

	};

});