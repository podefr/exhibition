define(function (require) {

	return function Exhibition($dataProvider) {

		var _dataProvider = $dataProvider;

		this.setDataProvider = function setDataProvider(dataProvider) {
			_dataProvider = dataProvider;
		};

		this.getDataProvider = function getDataProvider() {
			return _dataProvider;
		};

		this.start = function () {
			_dataProvider.init();
		};

	};

});