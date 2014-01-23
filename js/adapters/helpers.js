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

    addClass: function (value, className) {
    	if (value) {
    		this.classList.add(className);
    	} else {
    		this.classList.remove(className);
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