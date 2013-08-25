define(function (require) {

	return {

		createUrl: function createUrl(content, size) {
			if (content) {
				var url = "http://farm" + content.farm +
					".staticflickr.com/" + content.server +
					"/" + content.id +
					"_" + content.secret;

				if (size) {
					url += "_" + size;
				}

				return url + ".jpg";
			} else {
				return false;
			}
		}

	}


});