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
            $subscription,
            $subscriptionBox,
            msgFormatter,
            app,

            getQueryParams;

        app = intercal(AppDefinition);

        function error(msg) {
            alert(msg);
        }

        getQueryParams = (function () {
            // private var
            var qp = null;

            return function () {
                var parts, a, b, i, p, source;

                // memoized
                if (qp !== null) {
                    return qp;
                }

                source = window.location.search;
                a = source.substr(1).split('&');

                if (a === "") {
                    return {};
                }

                b = {};

                for (i = 0; i < a.length; i += 1) {
                    p = a[i].split('=');

                    if (p.length !== 2) {
                        continue;
                    }

                    b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
                }

                // remember it for next call
                qp = b;
                return b;
            };

        }());

        // call callback when enter is pressed on jqItem
        function onEnter(jqItem, callback) {
            jqItem.keyup(function (event) {
                if (event.keyCode === 13) {
                    callback();
                }
            });
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

        function addMessageToContainer(msg, dest) {
            // MUT: mutating parameter
            msg.date = (new Date(msg.timestamp * 1000)).toLocaleString();

            msgFormatter(msg, function (err, html) {
                dest.prepend(html);
            });
        }

        function addMessage(msg) {
            if ($msgs.hasClass("empty")) {
                $msgs
                    .html("")
                    .removeClass("empty");
            }

            addMessageToContainer(msg, $msgs);
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

        app.on.subscription.send.add(function () {
            var topic = $subscription.val();

            app.resource.subscription.create({subscriber: user, topic: topic});
        });

        function makeOnMsgs(clear) {
            return function onMsgs(ok, msgs) {
                if (ok) {
                    if (clear) {
                        $msgs.html("");
                    }

                    $.each(msgs, function (i, msg) {
                        app.on.msg.received.fire(msg);
                    });
                } else {
                    error("error loading messages");
                }
            };
        }

        app.on.resource.msgs.get.add(makeOnMsgs(true));
        app.on.resource.timeline.get.add(makeOnMsgs(true));
        app.on.resource.latest.get.add(makeOnMsgs(true));

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
            app.resource.timeline.get({user: user});
        }

        app.on.login.succeed.add(onLoginOk);

        function showLoginBox() {
            $msgBox.hide();
            $sessionBox.hide();
            $loginBox.show();
        }

        app.on.logout.succeed.add(showLoginBox);

        app.on.logout.succeed.add(app.resource.latest.get);
        app.on.login.failed.add(showLoginBox);
        app.on.login.failed.add(function (isInitialCheck) {
            if (!isInitialCheck) {
                error("login failed");
            }
        });

        function makeOnSessionResponse(isInitialCheck) {
            return function onSessionResponse(ok, session) {
                if (ok) {
                    app.on.login.succeed.fire(session);
                } else {
                    app.on.login.failed.fire(isInitialCheck);
                }
            };
        }

        app.on.resource.session.get.add(makeOnSessionResponse(true));
        app.on.resource.session.create.add(makeOnSessionResponse(false));
        app.on.resource.session.remove.add(function (ok, response) {
            if (ok) {
                app.on.logout.succeed.fire();
            } else {
                app.on.logout.failed.fire();
            }
        });

        app.on.resource.subscription.create.add(function (ok, response) {
            if (ok) {
                $subscriptionBox.hide();
            } else {
                error("error creating subscription");
            }
        });

        (function () {
            var
                pathParts = window.location.pathname.split("/"),
                lastPath = pathParts[pathParts.length - 1],
                itemId = getQueryParams().id;

            msgFormatter = compileTemplate(msgTpl);

            if (lastPath === "msg.html") {
                app.resource.msg.get({id: itemId})
                    .done(function (msg) {
                        addMessageToContainer(msg, $("#single-msg"));
                    })
                    .error(function () {
                        error("error loading message");
                    });
            } else {

                $msgs = $("#msgs");

                if (lastPath === "user.html") {
                    app.resource.msgs.get({user: itemId});
                } else {
                    $msgInput = $("#msg-input");
                    $msgBox = $("#msg-input-box");
                    clearMessages();
                    $loginBox = $("#login-box");
                    $sessionBox = $("#session-box");

                    $subscriptionBox = $("#subscription-box");
                    $subscription = $("#subscription");

                    $("#subscription-send").click(app.on.subscription.send.fire);

                    $("#msg-input-send").click(app.on.msg.send.fire);
                    $("#login-send").click(app.on.login.send.fire);
                    $("#logout-send").click(function (event) {
                        app.on.logout.send.fire();
                        event.preventDefault();
                    });

                    $("#show-subscription").click(function (event) {
                        $subscriptionBox.show();
                        event.preventDefault();
                    });

                    onEnter($("#password"), app.on.login.send.fire);
                    onEnter($subscription, app.on.subscription.send.fire);

                    $msgInput.keyup(function (event) {
                        if (event.ctrlKey && event.keyCode === 13) {
                            app.on.msg.send.fire();
                        }
                    });

                    app.resource.session.get();
                    app.resource.latest.get();
                }
            }

        }());

        window.app = app;
    }
);
