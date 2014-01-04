var OObject = require("olives").OObject,
    Bind = require("olives")["Bind.plugin"],
    Events = require("olives")["Event.plugin"],
    Observable = require("emily").Observable,
    Tools = require("emily").Tools;

function NavigationConstructor() {

    var events = new Events(this);

    this.plugins.addAll({
        "events": events
    });

    this.back = function back() {
        this.notify("back");
    };

    this.home = function home() {
        this.notify("home");
    };

}

module.exports = function NavigationFactory() {
    Tools.mixin(new OObject, NavigationConstructor.prototype);
    Tools.mixin(new Observable, NavigationConstructor.prototype);
    return new NavigationConstructor();
};