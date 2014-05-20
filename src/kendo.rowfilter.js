(function(f, define){
    define([ "./kendo.autcomplete" ], f);
})(function(){

var __meta__ = {
    id: "rowfilter",
    name: "Row filter",
    category: "framework",
    depends: [ "autocomplete" ],
    advanced: true //should I set this?
};

(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.ui,
        Widget = ui.Widget,
        CHANGE = "change",
        NS = ".kendoRowfilter",
        proxy = $.proxy;

    var Rowfilter = Widget.extend( {
        init: function(element, options) {
            var that = this, page, totalPages;

            Widget.fn.init.call(that, element, options);

            options = that.options;
            //that.dataSource = kendo.data.DataSource.create(options.dataSource);
            //that.linkTemplate = kendo.template(that.options.linkTemplate);
            //that.selectTemplate = kendo.template(that.options.selectTemplate);

            //that.dataSource.bind(CHANGE, that._refreshHandler);

            //that.element
                //.on(CLICK + NS , "a", proxy(that._click, that))
                //.addClass("k-pager-wrap k-widget");

            kendo.notify(that);
        },

        _refreshHandler: function() {
            
        },

        destroy: function() {
            var that = this;

            Widget.fn.destroy.call(that);

            //that.element.off(NS);
            //that.dataSource.unbind(CHANGE, that._refreshHandler);
            //that._refreshHandler = null;

            kendo.destroy(that.element);
        },

        events: [
            CHANGE
        ],

        options: {
            name: "Rowfilter",
            autoBind: true
        },

        setDataSource: function(dataSource) {

            this.dataSource.unbind(CHANGE, that._refreshHandler);
            this.dataSource = that.options.dataSource = dataSource;
            dataSource.bind(CHANGE, that._refreshHandler);

            if (that.options.autoBind) {
                dataSource.fetch();
            }
        },

        refresh: function(e) {

        }
    });

    ui.plugin(Rowfilter);
})(window.kendo.jQuery);

return window.kendo;

}, typeof define == 'function' && define.amd ? define : function(_, f){ f(); });
