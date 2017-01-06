(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("HLSDumpServer", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
var fs      = require("fs");
var express = require("express");
var M3U8    = WebModule["M3U8"];
var resolve = require("path").resolve;
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function HLSDumpServer(opionts) { // @arg Object - { verbose:Boolean, port:UIN32 }
    opionts = opionts || {};

    this._verbose = opionts["verbose"] || false;
    this._port    = opionts["port"]    || 8888;
    this._app     = express();
    this._timeMap = {}; // { url: timeStamp, ... }
    this._m3u8Cache = {}; // { url: Buffer }

    _init.call(this, this._app);
}

HLSDumpServer["prototype"] = Object.create(HLSDumpServer, {
    "constructor": { "value": HLSDumpServer }, // new HLSDumpServer(...):HLSDumpServer
});

// --- implements ------------------------------------------
function _init(app) {
    var that = this;

    app.set("etag", false);
    app.disable("x-powered-by");

    app.get("/", function(req, res) {
        res.send("Hello Express!");
    });
    app.get("/:ts.ts", function(req, res) {
        _sendMediaSegmentFile(req, res, req.params.ts + ".ts");
    });
    app.get("/:dir/:ts.ts", function(req, res) {
        _sendMediaSegmentFile(req, res, req.params.dir + "/" + req.params.ts + ".ts");
    });
    app.get("/:playlist.m3u8", function(req, res) {
        _sendMediaPlaylist(req, res, req.params.playlist + ".m3u8");
    });
    app.get("/:dir/:playlist.m3u8", function(req, res) {
        _sendMediaPlaylist(req, res, req.params.dir + "/" + req.params.playlist + ".m3u8");
    });
    // --- start server ---
    var server = app.listen(this._port, function () {
      //var host = server.address().address;
        var port = server.address().port;
        console.log('hlsdump server listening at http://localhost:%s', port);
    });

    function _sendMediaSegmentFile(req, res, url) {
        res.set("Content-Type", "video/MP2T");
        res.set("Cache-Control", "no-cache");
      //res.set("Cache-Control", "no-store");
        res.set("Accept-Ranges", "bytes");
        res.set("Access-Control-Allow-Origin", "*");
        res.removeHeader("Connection");
      //res.send( fs.readFileSync(url) );
        var absURL = resolve(url);
        res.sendFile(absURL);
    }

    function _sendMediaPlaylist(req, res, url) {
        if (url in that._m3u8Cache) {
//console.log("cached", that._m3u8Cache[url].length, url);
            _sendMediaSegmentPlaylist(req, res, url, that._m3u8Cache[url]);
        } else {
            M3U8.load(url, function(m3u8, url) {
//console.log("cache", m3u8.length, url);
                that._m3u8Cache[url] = m3u8;
                _sendMediaSegmentPlaylist(req, res, url, m3u8);
            }, function(error, url) {
            });
        }
    }

    function _sendMediaSegmentPlaylist(req, res, url, m3u8) {
        var playlist = M3U8.parse(m3u8);

        if (playlist.type === "LIVE" &&
            playlist.combined) {
            // LivePlaylist: #EXT-X-COMBINED:YES

            if (!(url in that._timeMap)) { // at first time
                that._timeMap[url] = Date.now();
            }
            var currentTime = Date.now() - that._timeMap[url];

            var trimedPlaylist = M3U8.trim(playlist, { startTime: currentTime, maxLength: 3 });

            m3u8 = M3U8.build(trimedPlaylist);
            //console.log("-----\n", currentTime, m3u8);
        }
        res.set("Content-Type", "application/vnd.apple.mpegurl");
        res.set("Cache-Control", "no-cache");
      //res.set("Cache-Control", "no-store");
        res.set("Accept-Ranges", "bytes");
        res.set("Access-Control-Allow-Origin", "*");
        res.removeHeader("Connection");
        res.send(m3u8);
    }
}

return HLSDumpServer; // return entity

});

