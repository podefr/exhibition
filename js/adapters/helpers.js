module.exports = {

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
    	if (url) {
	        this.style.backgroundImage = "url(" + url + ")";
    	} else {
    		this.style.backgroundImage = "";
    	}
    }

};