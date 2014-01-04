var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Events = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
    helpers = require("../adapters/helpers");

function CollageConstructor() {

    var collageModel = new Store([]),
        collage = new Bind(collageModel, helpers),
        events = new Events(this);

    this.plugins.addAll({
        "collage": collage,
        "events": events
    });

    this.startSlideshow = function startSlideshow(ev, dom) {
        this.notify("startSlideshow", collage.getItemIndex(dom));
    };

    this.setPhotoset = function setPhotoset(photoset) {
        if (!photoset) { return false; }
        collageModel.reset(photoset.map(function (photo) {
            photo.url = flickrContent.createUrl(photo, "z");
            return photo;
        }));
    };

}

module.exports = function CollageFactory() {
    Tools.mixin(new OObject, CollageConstructor.prototype);
    Tools.mixin(new Observable, CollageConstructor.prototype);
    return new CollageConstructor();
};