
window.app = {
    ROOT: "https://news.leonetwork.org/",
    categories : null,
    currentResults:null,
    initialize: function() {
        document.addEventListener('deviceready', function() {
            //start-up code in here...
            $.support.cors = true;

            $.get("categories.json", null, function(res) {
                app.categories = {};
                for (var i = 0; i < res.length; i++) {
                    app.categories[res[i].CategoryID] = res[i];
                };
            }, "json");

            app.runQuery();
        }, false);
    },

    show : function(obsid)
    {
        window.open('https://news.leonetwork.org/en/news/show/' + obsid, "_blank");
        return;

        if (typeof navigator !== "undefined" && navigator.app) {
            navigator.app.loadUrl('https://news.leonetwork.org/en/news/show/' + obsid, {openExternal: true});
        } else {
            window.open('https://news.leonetwork.org/en/news/show/' + obsid);
        }
    },

    working : function(isworking) {
        if(isworking == false)
        {
            $("#working").hide();
        }
        else
        {
            $("#working").show();
        }
    },

    runQuery : function(query, category) {
        app.working();
        var url = app.ROOT + "en/news/find";
        $.get(url, {query:query, category:category}, function(res) {
            app.currentResults = res;
            $("#results").html(app.applyTemplate("result_template", res.Results));
            app.working(false);
        }, "json");
    },

    loadNearby : function (obsID, lat, lng, km) {
        var more = $("#more-" + obsID);
        more.html("<img src='img/ajax-loader.gif' style='max-width:30px;'/>");

        $.get(app.ROOT + "en/news/near", { latitude : lat, longitude: lng, maxdistancekm:km }, function (res) {
            var tt = $("#related-results-template").html();
            Mustache.parse(tt);
            var html = [];
            var hasResults = false;
            for (var i = 0; i < res.Results.length; i++) {
                if (res.Results[i].Document.ObservationID != obsID)
                {
                    html.push(Mustache.render(tt, res.Results[i].Document));
                    hasResults = true;
                }
            }
            if (hasResults)
                more.html(html);
            else
                more.html("<div style='margin-top:20px;'><i>No other articles within " + km + " KM. <a class='btn' href=\"javascript:window.app.loadNearby('" + obsID + "', " + lat + ", " + lng + "," + (km*2) + ");\">Try " + (km*2) + " KM.</a></i></div>");
        }, "json");
    },

    share : function(obsID)
    {
        var block = $("#row-" + obsID);
        var title = block.find(".result-title").html();

        var options = {
          subject: title, // fi. for email
          url: 'https://news.leonetwork.org/en/news/show/' + obsID,
          chooserTitle: 'Choose an App' // Android only, you can override the default share sheet title
        }
 
        window.plugins.socialsharing.shareWithOptions(options);
    },

    _SHOWINGMAP : false,

    toggleMap : function() {
        if(app._SHOWINGMAP)
        {
            Mapbox.hide({});            
        }
        else
        {
            var markers = [];
            var centerOn = null;
            if(app.currentResults != null)
            {
                for (var i = 0; i < app.currentResults.Results.length; i++) {

                    var doc = app.currentResults.Results[i].Document;
                    if(doc.Location && doc.Location != null)
                    {
                        if(centerOn == null)
                            centerOn = {lat: doc.Location.Latitude, lng: doc.Location.Longitude};
                        
                        markers.push(
                            {
                                lat: doc.Location.Latitude,
                                lng: doc.Location.Longitude,
                                title: doc.ObservationTitle,
                                subtitle: doc.LocalizedObservationDate
                            }   
                        );
                    }
                };

                Mapbox.show({
                    style: 'light', // light|dark|emerald|satellite|streets , default 'streets'
                    margins: {
                      left: 0, // default 0
                      right: 0, // default 0
                      top: 70, // default 0
                      bottom: 0 // default 0
                    },
                    center: centerOn,
                    zoomLevel: 8, // 0 (the entire world) to 20, default 10
                    showUserLocation: false, // your app will ask permission to the user, default false
                    hideAttribution: true, // default false, Mapbox requires this default if you're on a free plan
                    hideLogo: true, // default false, Mapbox requires this default if you're on a free plan
                    hideCompass: false, // default false
                    disableRotation: false, // default false
                    disableScroll: false, // default false
                    disableZoom: false, // default false
                    disablePitch: false, // disable the two-finger perspective gesture, default false
                    markers: markers
                  },

                  // optional success callback
                  function(msg) {
                    Mapbox.addMarkerCallback(function (selectedMarker) {
                            //see if we can find the one that was selected
                            if(app.currentResults != null)
                            {
                                for (var i = 0; i < app.currentResults.Results.length; i++) {
                                    var doc = app.currentResults.Results[i].Document;
                                    if(doc.ObservationTitle == selectedMarker.title && doc.LocalizedObservationDate == selectedMarker.subtitle)
                                        app.show(doc.ObservationID);
                                };
                            }
                        });
                      },

                      // optional error callback
                      function(msg) {
                        alert("Error :( " + JSON.stringify(msg));
                      }
                    );


            }
        }
        app._SHOWINGMAP = !app._SHOWINGMAP;
    },

    loadSimilar : function (obsID) {
        var more = $("#more-" + obsID);
        more.html("<img src='img/ajax-loader.gif' style='max-width:30px;'/>");

        $.get(app.ROOT + "en/news/similar/" + obsID, null, function (res) {
            var tt = $("#related-results-template").html();
            Mustache.parse(tt);
            var html = [];
            var hasResults = false;
            for (var i = 0; i < res.length; i++) {
                if (res[i].ObservationID != obsID) {
                    html.push(Mustache.render(tt, res[i]));
                    hasResults = true;
                }
            }
            if (hasResults)
                more.html(html);
            else
                more.html("<div><i>No similar articles.</i></div>");
        }, "json");
    },


    applyTemplate : function(templateID, model)
    {
        var tt = $("#" + templateID).html();
        Mustache.parse(tt);

        if(!$.isArray(model))
            model = [model];

        var html = [];
        for (var i = 0; i < model.length; i++) {
            html.push(Mustache.render(tt, model[i]));
        }

        return html.join("");
    }

};
