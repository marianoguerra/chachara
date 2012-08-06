/*global define, setTimeout*/
define({
    "once": {
        "recents": "loaded"
    },
    "on": {
        "logout": "send succeed failed",
        "login": "send succeed failed",
        "msg": "send received",
        "subscription": "send",
        "msgs": "received",
        "latest": "received"
    },
    "resourceConfig": {
        "contentType": "application/json",
        "dataType": "json",
        "accepts": {
            "json": "application/json"
        },
        "timeout": 30000,
        "basePath": "../api/"
    },
    "resource": {
        "msg": {
            "path": {
                "post": "/msg",
                "get": "/msg/{id}"
            }
        },
        "subscription": {
            "path": {
                "post": "/subscription"
            },
            "schema": {
                "type": "object",
                "properties": {
                    "subscriber": {
                        "type": "string",
                        "description": "the user that subscribes to topic"
                    },
                    "topic": {
                        "type": "string",
                        "description": "the topic the subscriber subscribes to"
                    }
                }
            }
        },
        "msgs": {
            "path": {
                "get": "/msgs/{user}"
            },
            "config": {
                "addTimestampParam": true
            }
        },
        "timeline": {
            "path": {
                "get": "/timeline/{user}"
            },
            "config": {
                "addTimestampParam": true
            }
        },
        "latest": {
            "path": {
                "get": "/latest/msgs"
            },
            "config": {
                "addTimestampParam": true
            }
        },
        "user": {
            "path": {
                "put post": "/user"
            }
        },
        "session": {
            "path": {
                "get post delete": "/session"
            }
        }
    }
});

