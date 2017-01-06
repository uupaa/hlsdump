(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("HLSDump", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
var M3U8Spooler     = WebModule["M3U8Spooler"];
//var URI             = WebModule["URI"];
//var AAC             = WebModule["AAC"];
var ADTS            = WebModule["ADTS"];
var MPEG2TS         = WebModule["MPEG2TS"];
var MP4Muxer        = WebModule["MP4Muxer"];
var MP4Builder      = WebModule["MP4Builder"];
var ParameterSet    = WebModule["NALUnitParameterSet"];
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
var _parameterSet = new ParameterSet();
var AudioContext = global["AudioContext"]       ||       // [Chrome][Firefox][Edge]
                   global["webkitAudioContext"] || null; // [iOS Safari 6+]

// --- class / interfaces ----------------------------------
function HLSDump(url,       // @arg URLString
                 options) { // @arg Object - { dir, autoStart, bulkDurations, readyCallback, updateCallback, aac, mp4, pcm }
                            // @options.dir           String = "YYYYMMDD-hhmmss"
                            // @options.autoStart     Boolean = true
                            // @options.bulkDurations UINT32 = 1
                            // @options.readyCallback Function = null
                            // @options.updateCallback Function = null
                            // @options.aac           Boolean = false - dump aac file
                            // @options.mp4           Boolean = false - dump mp4 file
                            // @options.pcm           Boolean = false - dump pcm file (only Browser and Electron)
    var that = this;

    this._fs = null;
    if (IN_NODE || IN_EL || IN_NW) {
        this._fs = require("fs");
    }
    options = options || {};

    this._autoStart     = options["autoStart"];
    if (!("autoStart" in options)) {
        this._autoStart = true;
    }
    this._dir           = options["dir"]     || ("./" + _getTimestamp() + "/");
    this._playlistURL   = this._dir + "playlist.m3u8";
    this._bulkDurations = options["bulkDurations"] || 1;
    this._readyCallback = options["readyCallback"] || function() {};
    this._updateCallback = options["updateCallback"] || function() {};
    this._aac           = options["aac"]     || false;
    this._mp4           = options["mp4"]     || false;
    this._pcm           = options["pcm"]     || false;
    this._spooler       = null;
    this._live          = false; // lazy auto detection

    this._mediaPlaylistArray = []; // [MediaPlaylist, ...]

    if (AudioContext) {
        this._audioContext = new AudioContext();
    }

    if (this._fs) {
        this._fs["mkdir"](this._dir, function(err) {
            if (!err) { console.log("mkdir", that._dir); }
            _init.call(that);
        });
    } else {
        _init.call(this);
    }

    function _init() {
        that._spooler = _createSpooler.call(that);
        that._spooler["src"] = url;
        that._spooler["load"](function() {
            that._readyCallback();
            if (that._autoStart) {
                that["start"]();
            }
        });
    }
}

HLSDump["repository"] = "https://github.com/uupaa/hlsdump";
HLSDump["prototype"] = Object.create(HLSDump, {
    "constructor": { "value": HLSDump       }, // new HLSDump(...):HLSDump
    "dir":         { "get": function() { return this._dir; }},
    "playlistURL": { "get": function() { return this._playlistURL; }},
    "start":       { "value": HLSDump_start },
    "stop":        { "value": HLSDump_stop  },
});

// --- implements ------------------------------------------
function _createSpooler() {
    var that = this;

    return new M3U8Spooler({
        "autoStart": false,
      //"m3u8FetchIntervalRatio": 0.1,
        "errorCallback": function(error, url, code) {
            that._updateCallback("error", that._spooler, { error:error, url:url, code:code });
        },
        "updateCallback": function(cachedDurations) {
            if (cachedDurations > 0) {
                _demux.call(that, cachedDurations);
                that._updateCallback("update", that._spooler, { cachedDurations:cachedDurations });
            }
        },
        "m3u8Callback": function(url, m3u8, playlist, master) {
            if (!master) {
                that._live = playlist.type === "LIVE";
                // MediaPlaylistObject: { url, type, version, allowCache, mediaSequence, mediaSegments, targetDuration, totalDurations }
                // MediaSegmentObject: { tsID, tsURL, tsDuration, tsRange, tsTitle }

                // 全てのMediaSegmentを含む combined playlist を作成するために MediaPlaylist を保存しておく
                that._mediaPlaylistArray.push(playlist);
                that._updateCallback("m3u8", that._spooler, { url:url, m3u8:m3u8, playlist:playlist });
            }
        },
        "tsCallback": function(tsID, tsURL, tsBlob) {
            that._updateCallback("ts", that._spooler, { tsID:tsID, tsURL:tsURL, tsBlob:tsBlob });
        },
        "endCallback": function() { // Live の場合は呼ばれない
            that._updateCallback("end", that._spooler, {});
        },
    });
}

function HLSDump_start() {
    this._spooler["start"]();
}

function HLSDump_stop() {
    this._spooler["stop"]();
    _writeCombinedM3U8.call(this);
}

function _writeCombinedM3U8() {
    if (this._fs) {
        // 全ての mediaSegments を含む完全な mediaPlaylist を VOD または Live (Combined) 形式で作成する
        // Liveでは独自タグの #EXT-X-COMBINED:YES を追加する
        var lines = [
            "#EXTM3U",
            "#EXT-X-VERSION:3",
            "#EXT-X-ALLOW-CACHE:NO",
            "#EXT-X-TARGETDURATION:" + ((this._mediaPlaylistArray[0]["targetDuration"] / 1000) | 0),
            "#EXT-X-MEDIA-SEQUENCE:" +   this._mediaPlaylistArray[0]["mediaSequence"],
        ];
        if (this._live) {
            lines.push("#EXT-X-COMBINED:YES");
        }
        var tsIDMap = {};
        for (var i = 0, iz = this._mediaPlaylistArray.length; i < iz; ++i) {
            var mediaSegments = this._mediaPlaylistArray[i]["mediaSegments"];

            for (var j = 0, jz = mediaSegments.length; j < jz; ++j) {
                var obj        = mediaSegments[j]; // MediaSegmentObject: { tsID, tsURL, tsDuration, tsRange, tsTitle }
                var tsID       = obj["tsID"];
                var tsDuration = obj["tsDuration"];

                if (!(tsID in tsIDMap)) {
                    lines.push("#EXTINF:" + (tsDuration / 1000).toFixed(3) + ",", tsID + ".ts"); // #EXTINF:<duration>,\n<tsID>.ts\n
                    tsIDMap[tsID] = 1;
                }
            }
        }
        if (!this._live) {
            lines.push("#EXT-X-ENDLIST");
        }
        this._fs["writeFile"](this._playlistURL, lines.join("\n"));
    }
}

function _demux(/* cachedDurations */) {
    var that = this;

    // ある程度の長さでファイルを結合処理する(_bulkDurations が 1 ならts毎に個別に処理する)
    var chunk = this._spooler["use"](this._bulkDurations); // ChunkObject: { tsIDs, tsInfos, tsBlobs, chunkDurations }

    var tsIDs = chunk["tsIDs"]; // [tsID, ...]
    var tsID  = tsIDs[0];

    _dumpQueue(tsID, this._spooler["state"]);

    _toUint8Array(chunk["tsBlobs"], function(mpeg2ts_u8a) { // BlobArray to Uint8Array -> async
        var mpeg2ts             = MPEG2TS["demux"](mpeg2ts_u8a);
      //var PCR                 = mpeg2ts["VIDEO_PCR"][0];

        if (that._aac || that._pcm) {
            // --- audio ---
            var aac_u8a         = MPEG2TS["toByteStream"](mpeg2ts["AUDIO_TS_PACKET"]);
            var adts            = ADTS["parse"](aac_u8a); // AAC.js v2.0
          //var pcm_u8a         = ADTS["toUint8Array"](aac_u8a, adts);
            var audioDuration   = adts["duration"]; // the real(correct) duration. (unit: ms)
        }
        if (that._mp4) {
            // --- video ---
            var videoNALUnit    = MPEG2TS["toNALUnit"](mpeg2ts["VIDEO_TS_PACKET"]);
            var mp4tree         = MP4Muxer["mux"](videoNALUnit, {
                                        "audioDuration": audioDuration,
                                        "parameterSet":  _parameterSet,
                                    });
            var mp4file         = MP4Builder["build"](mp4tree); // { stream, diagnostic }
            var mp4_u8a         = mp4file["stream"];
        }

        if (that._fs) {
            _writeCombinedM3U8.call(that);
        }
        if (that._fs) {
            that._fs["writeFile"](that._dir + tsID + ".ts",  new Buffer(mpeg2ts_u8a));
        }
        if (that._fs && that._aac) {
            that._fs["writeFile"](that._dir + tsID + ".aac", new Buffer(aac_u8a));
        }
        if (that._fs && that._mp4) {
            that._fs["writeFile"](that._dir + tsID + ".mp4", new Buffer(mp4_u8a));
        }
        if (that._fs && that._pcm && AudioContext) {
            // --- pcm ---
            // 生成したファイルは Audacity の Raw データの取り込みダイアログで
            // 32bit-float, little-endian, 1 channel (mono), 44100Hz で取り込むことができる
            that._audioContext["decodeAudioData"](aac_u8a["buffer"], function(audioBuffer) { // AudioBuffer
              //var numberOfChannels = audioBuffer["numberOfChannels"];
                var leftChannel = audioBuffer["getChannelData"](0); // Left channel, Float32Array PCM Data
                that._fs["writeFile"](that._dir + tsID + ".raw", new Buffer(leftChannel["buffer"]));
            });
        }

        that._spooler["used"](tsIDs);
    });
}

function _toUint8Array(tsBlobs,         // @arg BlobArray - [tsBlob, ...] (ArrayBuffer in Node.js)
                       readyCallback) { // @arg Function - readyCallback(result:Uint8Array):void
                                        // @ret Uint8Array
    if (IN_NODE) {
        _toUint8Array_node(tsBlobs, readyCallback);
        return;
    }
    var u8a = new Uint8Array( _byteLength(tsBlobs) );
    var cursor = 0;
    var remainBlobs = tsBlobs.length;

    for (var i = 0, iz = tsBlobs.length; i < iz; ++i) {
        _readAsArrayBuffer(u8a, tsBlobs[i], cursor);
        cursor += tsBlobs[i]["size"];
    }

    function _readAsArrayBuffer(u8a, tsBlob, cursor) {
        var reader = new global["FileReader"]();

        reader["onload"] = function() {
            u8a.set(new Uint8Array(reader["result"]), cursor);
            if (--remainBlobs === 0) {
                readyCallback(u8a);
            }
        };
        reader["readAsArrayBuffer"](tsBlob);
    }

    function _byteLength(tsBlobs) { // @arg BlobArray
        var bytes = 0;
        for (var i = 0, iz = tsBlobs.length; i < iz; ++i) {
            bytes += tsBlobs[i]["size"];
        }
        return bytes;
    }
}

function _toUint8Array_node(tsBlobs,         // @arg ArrayBufferArray - [tsBlob, ...]
                            readyCallback) { // @arg Function - readyCallback(result:Uint8Array):void
                                             // @ret Uint8Array
    var u8a = new Uint8Array( _byteLength(tsBlobs) );
    var cursor = 0;

    for (var i = 0, iz = tsBlobs.length; i < iz; ++i) {
        u8a.set(new Uint8Array(tsBlobs[i]), cursor);
        cursor += tsBlobs[i]["byteLength"];
    }
    readyCallback(u8a);

    function _byteLength(tsBlobs) { // @arg BlobArray
        var bytes = 0;
        for (var i = 0, iz = tsBlobs.length; i < iz; ++i) {
            bytes += tsBlobs[i]["byteLength"];
        }
        return bytes;
    }
}

function _getTimestamp() {
    var date = new Date();
  //var YYYY = date.getFullYear();
  //var MM   = date.getMonth() + 1;
  //var DD   = date.getDate();
    var hh   = date.getHours();
    var mm   = date.getMinutes();
    var ss   = date.getSeconds();

    return [
      //YYYY,
      //(MM < 10 ? "0" + MM : MM),
      //(DD < 10 ? "0" + DD : DD), "-",
        (hh < 10 ? "0" + hh : hh),
        (mm < 10 ? "0" + mm : mm),
        (ss < 10 ? "0" + ss : ss)
    ].join(""); // "YYYYMMDD-hhmmss"
}

function _dumpQueue(tsID, state) {
    var queue = state["queue"];

    if (queue.length >= 28) {
        console.log("tsID=" + tsID + "," +
                    queue.slice(0, 10) + "..(" + (queue.length - 20) + ").." +
                    queue.slice(-10));
    } else {
        console.log("tsID=" + tsID + "," + queue);
    }
}

return HLSDump; // return entity

});

