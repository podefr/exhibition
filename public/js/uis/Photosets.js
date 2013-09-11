define(function (require) {

	var OObject = require("OObject"),
		Bind = require("Bind.plugin"),
		Event = require("Event.plugin"),
		flickrContent = require("../services/flickrContent"),
		Store = require("Store"),
		Observable = require("Observable"),
		Tools = require("Tools");

	function PhotosetsConstructor() {

		var viewModel = new Store(),
			bind = new Bind(viewModel),
			eventPlugin = new Event(this);

		this.plugins.addAll({
			"bind": bind,
			"event": eventPlugin
		});

		viewModel.watch("added", function (index, photoset) {
			photoset.url = flickrContent.createUrl(photoset, "z");
			this.set(index, photoset);
		}, viewModel);

		this.drillin = function drillin(event, dom) {

		};

		this.setPhotosets = function setPhotosets(photosets) {
			viewModel.reset(photosets);
		};

	}

	return function PhotosetsFactory() {
		Tools.mixin(new OObject, PhotosetsConstructor.prototype);
		Tools.mixin(new Observable, PhotosetsConstructor.prototype);
		var photosets = new PhotosetsConstructor();
		return photosets;
	}

});