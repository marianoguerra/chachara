/*global require */
require.config({
    baseUrl: "static/js/",
    paths: {
        "json": "http://cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2",
        "jquery": "http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min",
        "dustjs": "http://linkedin.github.com/dustjs/dist/dust-full-1.0.0"
    },

    shim: {
        json: {
            exports: "JSON"
        },
        dustjs: {
            exports: "dust"
        }
    }
});

require(["jquery", "json", "dustjs"],

    function ($, Json, Template) {
        "use strict";

        alert("hello world");
    }
);
