define(function (require) {

	var StateMachine = require("StateMachine");

	return new StateMachine("Galleries", {

		"Galleries": [
			["drillin", function onDrillin() {

			}, "Collage"]
		],

		"Collage": [
			["back", function onBack() {

			}, "Galleries"]
		]

	});

});