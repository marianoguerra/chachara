/*global require */
require.config({
    baseUrl: "js/",
    paths: {
        "json": "http://cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2",
        "jquery": "http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min",
        "dustjs": "libs/dust-full-1.0.0",
        "intercal": "libs/intercal"
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

require(["jquery", "json", "dustjs", "intercal", "app", "text!../tpls/msg.html"],

    function ($, Json, Template, intercal, AppDefinition, msgTpl) {
        "use strict";
        var
            counter = 0,
            user = null,
            $msgs,
            $msgInput,
            $msgBox,
            $loginBox,
            $sessionBox,
            msgFormatter,
            app;

        app = intercal(AppDefinition);

        function error(msg) {
            alert(msg);
        }

        function clearMessages() {
            $msgs.html('<div class="alert alert-info">empty :(</div>').addClass("empty");
        }

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

            // MUT: mutating parameter
            msg.date = (new Date(msg.timestamp * 1000)).toLocaleString();

            msgFormatter(msg, function (err, html) {
                $msgs.prepend(html);
            });
        }

        app.on.resource.msg.create.add(function (ok, response) {
            if (ok) {
                addMessage(response);
                $msgInput
                    .val("")
                    .focus();
            } else {
                error("error sending message");
            }
        });

        app.on.msg.send.add(function () {
            var text = $msgInput.val();
            app.resource.msg.create({username: user, msg: text});
        });

        app.on.resource.msgs.get.add(function (ok, msgs) {
            if (ok) {
                $.each(msgs, function (i, msg) {
                    app.on.msg.received.fire(msg);
                });
            } else {
                error("error loading messages");
            }
        });

        app.on.msg.received.add(function (msg) {
            addMessage(msg);
        });

        app.on.logout.send.add(function () {
            app.resource.session.remove();
        });


        app.on.login.send.add(function () {
            var
                username = $("#username").val(),
                password = $("#password").val();

            app.resource.session.create({username: username, password: password});
        });

        function onLoginOk(session) {
            user = session.username;
            $loginBox.hide();
            $msgBox.show();
            clearMessages();
            $sessionBox.show();
            $("#password").val("");
            app.resource.msgs.get({user: user});
        }

        app.on.login.succeed.add(onLoginOk);

        function showLoginBox() {
            $msgBox.hide();
            $sessionBox.hide();
            $loginBox.show();
        }

        app.on.logout.succeed.add(showLoginBox);
        app.on.login.failed.add(showLoginBox);

        function onSessionResponse(ok, session) {
            if (ok) {
                app.on.login.succeed.fire(session);
            } else {
                app.on.login.failed.fire();
            }
        }

        app.on.resource.session.get.add(onSessionResponse);
        app.on.resource.session.create.add(onSessionResponse);
        app.on.resource.session.remove.add(function (ok, response) {
            if (ok) {
                app.on.logout.succeed.fire();
            } else {
                app.on.logout.failed.fire();
            }
        });

        (function () {
            $msgs = $("#msgs");
            $msgInput = $("#msg-input");
            $msgBox = $("#msg-input-box");
            clearMessages();
            $loginBox = $("#login-box");
            $sessionBox = $("#session-box");

            msgFormatter = compileTemplate(msgTpl);

            $("#msg-input-send").click(app.on.msg.send.fire);
            $("#login-send").click(app.on.login.send.fire);
            $("#logout-send").click(function (event) {
                app.on.logout.send.fire();
                event.preventDefault();
            });

            $msgInput.keyup(function (event) {
                if (event.ctrlKey && event.keyCode === 13) {
                    app.on.msg.send.fire();
                }
            });

            app.resource.session.get();

        }());

        window.app = app;
    }
);
