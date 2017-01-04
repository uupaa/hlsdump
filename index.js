#!/usr/bin/env node

(function(global) {

var USAGE = _multiline(function() {/*
    Usage:
        node index.js [-h or --help]
                      [-v or --verbose]
                      [-d output-dir]
                      [-aac]
                      [-mp4]
                      [-pcm]
                      playlist.m3u8      # http://example.com/playlist.m3u8

    Example:
        node index.js https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8

    See:
        https://github.com/uupaa/hlsdump/wiki/
*/});


var CONSOLE_COLOR = {
        RED:    "\u001b[31m",
        YELLOW: "\u001b[33m",
        GREEN:  "\u001b[32m",
        CLEAR:  "\u001b[0m"
    };

require("./lib/WebModule");
require("./node_modules/uupaa.useragent.js/lib/UserAgent.js");
require("./node_modules/uupaa.hexdump.js/lib/HexDump.js");
require("./node_modules/uupaa.m3u8spooler.js/node_modules/uupaa.m3u8.js/node_modules/uupaa.uri.js/lib/URISearchParams.js");
require("./node_modules/uupaa.m3u8spooler.js/node_modules/uupaa.m3u8.js/node_modules/uupaa.uri.js/lib/URI.js");
require("./node_modules/uupaa.mpeg2ts.js/node_modules/uupaa.fileloader.js/lib/FileLoader.js");
require("./node_modules/uupaa.mpeg2ts.js/node_modules/uupaa.fileloader.js/lib/FileLoaderQueue.js");
require("./node_modules/uupaa.m3u8spooler.js/node_modules/uupaa.m3u8.js/node_modules/uupaa.aacprofile.js/lib/AACProfile.js");
require("./node_modules/uupaa.m3u8spooler.js/node_modules/uupaa.m3u8.js/node_modules/uupaa.h264profile.js/lib/H264Profile.js");
require("./node_modules/uupaa.m3u8spooler.js/node_modules/uupaa.m3u8.js/lib/M3U8.js");
require("./node_modules/uupaa.m3u8spooler.js/lib/M3U8Segment.js");
require("./node_modules/uupaa.m3u8spooler.js/lib/M3U8Spooler.js");
require("./node_modules/uupaa.nalunit.js/node_modules/uupaa.bit.js/lib/Bit.js");
require("./node_modules/uupaa.nalunit.js/node_modules/uupaa.bit.js/lib/BitView.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnitNON_IDR.js");
require("./node_modules/uupaa.nalunit.js/lib/NALUnit.js");
require("./node_modules/uupaa.aac.js/node_modules/uupaa.hash.js/lib/Hash.js");
require("./node_modules/uupaa.aac.js/lib/AAC.js");
require("./node_modules/uupaa.aac.js/lib/ADTS.js");
require("./node_modules/uupaa.mpeg2ts.js/lib/MPEG2TSNALUnit.js");
require("./node_modules/uupaa.mpeg2ts.js/lib/MPEG2TSDemuxer.js");
require("./node_modules/uupaa.mpeg2ts.js/lib/MPEG2TS.js");
require("./node_modules/uupaa.filestore.js/node_modules/uupaa.mimetype.js/lib/MimeType.js");
require("./node_modules/uupaa.filestore.js/lib/FileStoreSandBox.js");
require("./node_modules/uupaa.filestore.js/lib/FileStore.js");
require("./node_modules/uupaa.mp4muxer.js/node_modules/uupaa.mp4parser.js/node_modules/uupaa.typedarray.js/lib/TypedArray.js");
require("./node_modules/uupaa.mp4muxer.js/node_modules/uupaa.mp4parser.js/lib/MP4Parser.js");
require("./node_modules/uupaa.mp4muxer.js/lib/MP4Muxer.js");
require("./node_modules/uupaa.mp4builder.js/lib/MP4Builder.js");

var HLSDump = require("./lib/HLSDump.js");

//var fs      = require("fs");
//var cp      = require("child_process");
//var wmlib   = process.argv[1].split("/").slice(0, -2).join("/") + "/lib/"; // "WebModule/lib/"
var argv    = process.argv.slice(2);
var options = _parseCommandLineOptions({
        help:       false,      // Boolean: show help.
        verbose:    false,      // Boolean: verbose mode.
        dir:        "",         // String: output dir.
        playlist:   "",         // String: playlist.m3u8
        aac:        false,      // Boolean: save aac file
        mp4:        false,      // Boolean: save mp4 file
        pcm:        false,      // Boolean: save pcm
    });

if (options.help || options.playlist === "") {
    console.log(CONSOLE_COLOR.YELLOW + USAGE + CONSOLE_COLOR.CLEAR);
    return;
}

if (options.verbose) {
}

var dump = new HLSDump(options.playlist, {
    dir:            options.dir, // "./" or "./{timestamp}/"
    autoStart:      false,
    bulkDuration:   1,
    readyCallback:  function() {
        dump.start();
    },
    aac:            options.aac,
    mp4:            options.mp4,
    pcm:            options.pcm,
});

function _parseCommandLineOptions(options) { // @arg Object:
                                             // @ret Object:
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help = true; break;
        case "-v":
        case "--verbose":   options.verbose = true; break;
        case "-d":          options.outputdir = argv[++i]; break;
        case "-aac":        options.aac = true; break;
        case "-mp4":        options.mp4 = true; break;
        case "-pcm":        options.pcm = true; break;
        default:            options.playlist = argv[i];
        }
    }
    return options;
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

})(GLOBAL);

