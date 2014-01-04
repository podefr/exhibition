define(function (require) {

	return {

		hide: function (value) {
			if (value) {
				this.style.display = "none";
			} else {
				this.style.display = "";
			}
		},

		show: function (value) {
			if (!value) {
				this.style.display = "none";
			} else {
				this.style.display = "";
			}
		},

		background: function (url) {
			this.style.backgroundImage = "url(" + url + ")";
		}

	};

});