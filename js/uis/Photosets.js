var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Event = require("olives")["Event.plugin"],
    flickrContent = require("../services/flickrContent"),
    Store = require("emily").Store,
    Observable = require("emily").Observable,
    Tools = require("emily").Tools,
    helpers = require("../adapters/helpers");

function PhotosetsConstructor() {

    var viewModel = new Store(),
        bind = new Bind(viewModel, helpers),
        eventPlugin = new Event(this);

    this.plugins.addAll({
        "bind": bind,
        "event": eventPlugin
    });

    this.drillin = function drillin(event, dom) {
        var photoset = viewModel.get(bind.getItemIndex(dom));
        this.notify("drillin", photoset.photoset_id);
    };

    this.setPhotosets = function setPhotosets(photosets) {
        viewModel.reset(photosets.map(function (photoset) {
            photoset.url = flickrContent.createUrl(photoset, "z");
            return photoset;
        }));
    };

}

module.exports = function PhotosetsFactory() {
    Tools.mixin(new OObject, PhotosetsConstructor.prototype);
    Tools.mixin(new Observable, PhotosetsConstructor.prototype);
    return new PhotosetsConstructor();
}