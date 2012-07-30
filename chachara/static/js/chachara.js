/*global require */
require.config({
    baseUrl: "js/",
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

require(["jquery", "json", "dustjs", "text!../tpls/msg.html"],

    function ($, Json, Template, msgTpl) {
        "use strict";
        var
            counter = 0,
            user = null,
            $msgs,
            $msgInput,
            msgFormatter;

        function compileTemplate(template) {
            var name = "template" + counter,
                compiled = null;

            counter += 1;
            return function (data, callback) {
                if (compiled === null) {
                    compiled = Template.compile(template, name);
                    Template.loadSource(compiled);
                }

                Template.render(name, data, callback);
            };
        }

        function addMessage(msg) {
            if ($msgs.hasClass("empty")) {
                $msgs
                    .html("")
                    .removeClass("empty");
            }

            msgFormatter(msg, function (err, html) {
                $msgs.prepend(html);
            });
        }

        function onMessageSend() {
            var text = $msgInput.val();

            addMessage({user: user, msg: text, date: "now"});
            $msgInput
                .val("")
                .focus();
        }

        (function () {
            user = "marianoguerra";

            $msgs = $("#msgs");
            $msgInput = $("#msg-input");

            msgFormatter = compileTemplate(msgTpl);

            $("#msg-input-send").click(onMessageSend);

            $msgInput.keyup(function (event) {
                if (event.ctrlKey && event.keyCode === 13) {
                    onMessageSend();
                }
            });

        }());
    }
);
