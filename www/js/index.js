
window.app = {
    ROOT: "https://news.leonetwork.org/",
    categories : null,
    currentResults:null,
    initialize: function() {
        document.addEventListener('deviceready', function() {
            //start-up code in here...
            $.support.cors = true;

            //categories.json is bundled in www
            $.get("categories.json", null, function(res) {
                app.categories = {};
                for (var i = 0; i < res.length; i++) {
                    app.categories[res[i].CategoryID] = res[i];
                };

                app.runQuery();

            }, "json");

            
        }, false);
    },

    show : function(obsid)
    {
        //note that should be able to pass _system as the target to get this to open in system browser
        cordova.InAppBrowser.open('https://news.leonetwork.org/en/news/show/' + obsid, '_blank', 'location=yes');
        //window.open('https://news.leonetwork.org/en/news/show/' + obsid, "_blank");
        return false;
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
        $("#map").css("visibility", "hidden");
        $("#results").show();
        app.working();
        var url = app.ROOT + "en/news/find";
        $.get(url, {query:query, category:category}, function(res) {
            app.currentResults = res;

            
            //some preprocessing
            for (var i = 0; i < res.Facets.Categories.length; i++) {
                var c = res.Facets.Categories[i];
                var catID = c.Value.split('|')[0];
                var catDef = app.categories[catID];
                if(catDef)
                {
                    res.Facets.Categories[i].CategoryID = catDef.CategoryID;
                    res.Facets.Categories[i].CategoryName = catDef.CategoryName;
                    res.Facets.Categories[i].IconSvg = catDef.IconSvg;
                }
            };

            $("#results").html(app.applyTemplate("result_template", res.Results));

            //add the category thumbnails
            var cats = $("#categories");
            cats.html("");
            var html = "<a href='javascript:app.showCategoryDetails();'>";

            for (var i = 0; i < res.Facets.Categories.length; i++) {
                var c = res.Facets.Categories[i];
                html += c.IconSvg;
            };

            html += "</a>";
            cats.html(html);

            app.working(false);
        }, "json");
    },

    showCategoryDetails : function() {
        if(app.currentResults != null)
        {
            $("#categories").html(app.applyTemplate("category_template", app.currentResults.Facets.Categories));
        }
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
        return false;
    },

    _SHOWINGMAP : false,
    _MAP : null,

    toggleMap : function() {
        if(app._SHOWINGMAP)
        {
            $("#map").css("visibility", "hidden");
            $("#results").show();
        }
        else
        {
            var markers = [];
            var centerOn = null;
            if(app.currentResults != null)
            {
                //mapbox GL version
                mapboxgl.accessToken = 'pk.eyJ1IjoibGVvbmV0d29yayIsImEiOiIzZTcwOTc5YjA3ZGQwZWNlNjMyMjIwOWIxNmVhMTExNSJ9.0Bj60Y4gR_bkN3AobSIeaA';
                app._MAP = new mapboxgl.Map({
                    container: 'map', // container id
                    style: 'mapbox://styles/mapbox/outdoors-v9', // stylesheet location
                    center: [-74.50, 40], // starting position [lng, lat]
                    zoom: 9 // starting zoom
                });

                var popup = $("#popup_result_template").html();
                Mustache.parse(popup);

                var bounds = new mapboxgl.LngLatBounds();

                for (var i = 0; i < app.currentResults.Results.length; i++) 
                {
                    var result = app.currentResults.Results[i];
                    var doc = result.Document;
                    if(doc.Location && doc.Location != null)
                    {           
                        bounds.extend([doc.Location.Longitude, doc.Location.Latitude]);
                        var p = new mapboxgl.Popup({ offset: 25 }).setHTML(Mustache.render(popup, result));
                        var marker = new mapboxgl.Marker().setLngLat([doc.Location.Longitude, doc.Location.Latitude]).setPopup(p).addTo(app._MAP);
                    }
                }

                app._MAP.fitBounds(bounds);
            }
            $("#results").hide();
            $("#map").css("visibility", "visible"); 
        }

        app._SHOWINGMAP = !app._SHOWINGMAP;
        $("#mapButton").html(app._SHOWINGMAP ? "List" : "Map");
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
