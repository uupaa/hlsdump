# hlsdump [![Build Status](https://travis-ci.org/uupaa/hlsdump.svg)](https://travis-ci.org/uupaa/hlsdump)

[![npm](https://nodei.co/npm/uupaa.hlsdump.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.hlsdump/)

HLS dump tool.

Download a playlist and media segment files from server, Save a m3u8, ts, aac, pcm and mp4 files to local.

You can reproduce the behavior of the server using the locally saved playlist.

This module made of [WebModule](https://github.com/uupaa/WebModule).

## Documentation
- [Overview](https://github.com/uupaa/hlsdump/wiki/)
- [API Spec](https://github.com/uupaa/hlsdump/wiki/)

## Electron

```js
<script src="<module-dir>/lib/WebModule.js"></script>
<script src="<module-dir>/lib/HLSDump.js"></script>

<input type="checkbox" id="aac" value="aac" checked />aac
<input type="checkbox" id="mp4" value="mp4" checked />mp4
<input type="checkbox" id="pcm" value="pcm" checked />pcm
<hr />
<input id="url" type="text" value="" placeholder="http://.../playlist.m3u8" style="width:40%" />
<input type="button" value="rec" onclick="__rec()" />
<input type="button" value="stop" onclick="__stop()" />

<script>

var dump = null;

function __rec() {
    var url = document.querySelector("#url").value || "";

    dump = new HLSDump(url, {
        autoStart:      false,
        dir:            "", // mkdir "test/el/{timestamp}/" dir
        autoStart:      false,
        bulkDuration:   1,
        readyCallback:  function() {
            dump.start();
        },
        updateCallback: function(type, spooler, props) {
            switch (type) {
            case "error":  break;
            case "update": break;
            case "ts":     break;
            case "end":    break;
            }
        },
        aac:            !!document.querySelector("#aac").checked,
        mp4:            !!document.querySelector("#mp4").checked,
        pcm:            !!document.querySelector("#pcm").checked,
    });
}
function __stop() {
    if (dump) {
        dump.stop();
    }
}

</script>
```

## Node.js

```sh
# show help
$ node index.js --help

# dump playlist, ts and aac files
$ node index.js -d 12345 -aac https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8

mkdir ./12345/
tsID=4930,rLL
tsID=4931,UrC
tsID=4932,UUrC
tsID=4933,UUUrC
tsID=4934,UUUUrC
tsID=4935,UUUUUrC
tsID=4936,UUUUUUrC
tsID=4937,UUUUUUUrC
tsID=4938,UUUUUUUUrC
 :
```

