module.exports = {

    hide: function (value) {
        if (value) {
            this.style.display = "none";
        } else {
            this.style.display = "block";
        }
    },

    show: function (value) {
        if (!value) {
            this.style.display = "none";
        } else {
            this.style.display = "block";
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