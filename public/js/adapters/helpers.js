define(function (require) {

	return {

		hide: function () {
			this.style.display = "none";
		},

		show: function () {
			this.style.display = "";
		},

		background: function (url) {
			this.style.backgroundImage = "url(" + url + ")";
		}

	};

});