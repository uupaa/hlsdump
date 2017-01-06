# hlsdump [![Build Status](https://travis-ci.org/uupaa/hlsdump.svg)](https://travis-ci.org/uupaa/hlsdump)

[![npm](https://nodei.co/npm/uupaa.hlsdump.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.hlsdump/)

HLS dump tool.

Download a playlist and media segment files from server, Save a m3u8, ts, aac, pcm and mp4 files to local.

You can reproduce the behavior of the server using the locally saved playlist.

This module made of [WebModule](https://github.com/uupaa/WebModule).

## Documentation
- [Overview](https://github.com/uupaa/hlsdump/wiki/)
- [API Spec](https://github.com/uupaa/hlsdump/wiki/HLSDump)

## Browser

```sh
$ npm run browser  # run at default Browser
                   # I will works, but can not save the file.
```

## Electron

```sh
$ npm run el  # run at Electron
```

## Node.js

Show usage.

```sh
$ node index.js --help

>    Usage:
>        Dump(store hls files to local):
>            node index.js [-h or --help]                # show help
>                          [-v or --verbose]             # verbose mode
>                          [-d or --dir <output-dir>]    # output dir
>                          [-aac]                        # create aac files
>                          [-mp4]                        # create mp4 files
>                          [-pcm]                        # create pcm files
>                          playlist.m3u8                 # dump target playlist eg: http://example.com/playlist.m3u8
>
>        Server(reproduce hls file):
>            node index.js [-s or --server]              # run hls server
>                          [-p or --port <number>]       # port number. default 8888
>                          [-t or --start-time <number>] # start time (sec). default 0.0
                           [-l or --live-loop]           # loop playback in live
>
>    Example:
>        node index.js https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8
>
>    See:
>        https://github.com/uupaa/hlsdump/wiki/
```


### HLS Dump

Dump playlist, ts and aac files.

```sh

$ node index.js -d 12345 -aac https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8

>   mkdir ./12345/
>   tsID=4930,rLL
>   tsID=4931,UrC
>   tsID=4932,UUrC
>   tsID=4933,UUUrC
>   tsID=4934,UUUUrC
>   tsID=4935,UUUUUrC
>   tsID=4936,UUUUUUrC
>   tsID=4937,UUUUUUUrC
>   tsID=4938,UUUUUUUUrC
```

## HLS Server

Start hlsdump server. reproduce hls files.

```sh
$ node index.js -s -p 8888

>   hlsdump server listening at http://localhost:8888
```














