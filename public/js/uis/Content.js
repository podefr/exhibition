define(function (require) {

	return function ContentConstructor($content) {

		var _content = $content,
			_size = "";

		this.setContent = function setContent(content) {
			if (typeof content == "object" &&
				typeof content.farm != "undefined" &&
				typeof content.server != "undefined" &&
				typeof content.secret != "undefined" &&
				typeof content.id != "undefined") {
				_content = content;
				return true;
			} else {
				throw new Error("content", content, "must contain a farm, server, id and secret properties");
			}
		};

		this.getContent = function getContent() {
			return _content;
		};

		this.load = function load() {

		};

		this.setSize = function setSize(size) {
			if (typeof size == "string") {
				_size = size;
				return true;
			} else {
				return false;
			}
		};

		this.getSize = function getSize() {
			return _size;
		};

		this.createUrl = function createUrl() {
			if (_content) {
				var url = "http://farm" + _content.farm +
					".staticflickr.com/" + _content.server +
					"/" + _content.id +
					"_" + _content.secret;

				if (_size) {
					url += "_" + _size;
				}

				return url + ".jpg";
			} else {
				return false;
			}
		};
	}


});