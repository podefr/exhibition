define(function (require) {

	return function Exhibition() {

		var _dataProvider = null,
		StateMachine = require("StateMachine");

		this.setDataProvider = function (dataProvider) {
			_dataProvider = dataProvider;
		};

		this.start = function () {

		};

	};

});