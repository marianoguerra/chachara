/*global define, setTimeout*/
define({
    "once": {
        "recents": "loaded"
    },
    "on": {
        "logout": "send succeed failed",
        "login": "send succeed failed",
        "msg": "send received",
        "msgs": "received"
    },
    "resourceConfig": {
        "contentType": "application/json",
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
        "msgs": {
            "path": {
                "get": "/msgs/{user}"
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

