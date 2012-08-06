'''HTTP API for chachara app'''
import time
import json
import hmac
import urlparse
import datetime

from functools import update_wrapper

import flask
from flask import Flask, redirect, url_for, request
from flask_negotiate import consumes, produces

import feedparser
import feedformatter
import pubsubhubbub_publish as pshb

app = Flask(__name__)

import mime
import model
import utils
import settings

def response(status=200, content=None, content_type=mime.JSON):
    return flask.Response(response=content, status=status,
            content_type=content_type)

def status_response(status=200, ok=True, reason="ok"):
    content = json.dumps({"ok": ok, "reason": reason})

    return response(status, content)

def get_domain(request):
    '''
    return the domain from this server (for example http://localhost:8080)
    '''

    parts = urlparse.urlparse(request.url_root)

    return parts.scheme + "://" + parts.netloc

def parse_messages(data, timeline):
    '''
    return a list of model.Message objects from *data* which contains an atom
    feed as a string
    '''

    feed = feedparser.parse(data)

    msgs = []

    for entry in feed['entries']:
        author = entry.author
        text = entry.description
        date = datetime.datetime(*entry.updated_parsed[:7])
        timestamp = int(time.mktime(date.timetuple()))

        if hasattr(entry, "tags"):
            tags = [tag.term[1:] for tag in entry.tags if tag.term.startswith('#')]
            mentions = [tag.term[1:] for tag in entry.tags if tag.term.startswith('@')]
        else:
            tags = []
            mentions = []

        msg = model.Message(owner=timeline, username=author, msg=text,
                timestamp=timestamp)

        msgs.append(msg)

    return msgs

def authenticated_only(fun):
    def wrapper(**kwargs):
        if 'username' in flask.session:
            username = flask.session['username']
            return fun(username, **kwargs)
        else:
            return status_response(401, ok=False, reason="not authenticated")

    return update_wrapper(wrapper, fun)

@app.route("/")
@produces(mime.HTML)
def index():
    return redirect(url_for('static', filename="index.html"))

@app.route('/api/session', methods=['POST'])
@consumes(mime.JSON)
@produces(mime.JSON)
def create_session():
    msgdct  = flask.json.loads(request.data)

    username = msgdct['username']
    password = msgdct['password']
    hashed_password = utils.encrypt(password, settings.SALT)

    if model.User.get_by_username_and_password(username, hashed_password) is None:
        return status_response(401, ok=False, reason="authentication failed")
    else:
        flask.session['username'] = username
        return flask.jsonify(username=username)

@app.route('/api/session', methods=['GET'])
@authenticated_only
@produces(mime.JSON)
def check_session(username):
    return flask.jsonify(username=username)

@app.route('/api/session', methods=['DELETE'])
@authenticated_only
@produces(mime.JSON)
def delete_session(username):
    flask.session.pop('username', None)
    return status_response()

@app.route('/api/msg', methods=['POST'])
@authenticated_only
@consumes(mime.JSON)
@produces(mime.JSON)
def create_message(session_username):
    msgdct  = flask.json.loads(request.data)
    username = msgdct['username']

    if session_username == username:
        msg = msgdct['msg']
        timestamp = int(time.time())

        message = model.Message(
            username=username,
            owner=username,
            msg=msg,
            timestamp=timestamp)

        message.put()

        try:
            feed_url = get_domain(request) + "/api/msgs/" + username + ".xml"
            app.logger.info("sending ping to pshb from feed %s" % feed_url)
            pshb.publish(settings.HUB_URL, feed_url)
        except pshb.PublishError as error:
            app.logger.error("error sending ping to pubsubhubbub %s" % str(error))

        return flask.jsonify(**message.toJSON())
    else:
        return status_response(403, ok=False, reason="unauthorized")

@app.route('/api/msg/<msgid>', methods=['GET'])
def get_message(msgid):
    msg = model.Message.by_id(msgid)

    if msg is None:
        return status_response(404, ok=False, reason="message not found")
    else:
        return response(content=json.dumps(msg.toJSON()))

@app.route('/api/subscription', methods=['POST'])
@authenticated_only
@consumes(mime.JSON)
@produces(mime.JSON)
def create_subscription(session_username):
    msgdct  = flask.json.loads(request.data)
    username = msgdct['subscriber']

    if session_username == username:
        topic = msgdct['topic']

        subscription = model.Subscription.get_by_subscriber_and_topic(username, topic)

        if subscription is None:
            secret = hmac.new(settings.SECRET_KEY, "%d%s" % (int(time.time()), settings.SALT)).hexdigest()

            subscription = model.Subscription(
                subscriber=username,
                topic=topic,
                secret=secret)

            subscription.put()
            callback = get_domain(request) + "/api/notify/" + session_username
            app.logger.info("subscribing to %s, callback %s in %s", topic,
                    callback, settings.HUB_URL)
            utils.pshb_subscribe(settings.HUB_URL, topic, callback, secret)

            return flask.jsonify(**subscription.toJSON())
        else:
            return status_response(400, ok=False, reason="subscription already exists")
    else:
        return status_response(403, ok=False, reason="unauthorized")

def msgs_to_atom(msgs, reverse, data):
    user = data["user"]
    domain = data["domain"]

    feed = feedformatter.Feed()
    feed.feed["title"] = "%s's feed" % user
    feed.feed["link"] = domain + "/api/msgs/" + user + ".xml"
    feed.feed["author"] = user
    feed.feed["description"] = "%s's pico rants" % user

    msgs = list(msgs)

    if reverse:
        msgs.reverse()

    for msg in msgs:
        mid = str(msg.key())
        item = {}
        item["author"] = user
        item["title"] = ""
        item["link"] = domain + "/static/msg.html?id=" + mid
        item["description"] = msg.msg
        item["guid"] = mid
        item["pubDate"] = time.gmtime(msg.timestamp)

        feed.items.append(item)

    return response(200, feed.format_atom_string(pretty=True), mime.ATOM)

def msgs_to_json(msgs, reverse, data=None):
    json_messages = [msg.toJSON() for msg in msgs]

    if reverse:
        json_messages.reverse()

    return response(content=json.dumps(json_messages))

def get_msgs_atom(request, getter, reverse, data):
    return get_msgs(request, getter, reverse, msgs_to_atom, data)

def get_msgs_json(request, getter, reverse):
    return get_msgs(request, getter, reverse, msgs_to_json)

def get_msgs(request, getter, reverse, formatter, formatter_data=None):
    offset_s = request.args.get("offset", 0)
    limit_s = request.args.get("limit", 100)

    try:
        offset = int(offset_s)
        limit = int(limit_s)
    except ValueError:
        return status_response(400, ok=False, reason="invalid parameter")

    if limit > 200:
        return status_response(400, ok=False, reason="invalid parameter")
    else:
        msgs = getter(offset, limit)
        return formatter(msgs, reverse, formatter_data)

@app.route('/api/msgs/<user>.xml', methods=['GET'])
def atom_get_latest_msgs(user):
    getter = lambda offset, limit: model.Message.get_from_user(user, offset, limit)
    data = dict(user=user, domain=get_domain(request))
    return get_msgs_atom(request, getter, False, data)

@app.route('/api/latest/msgs', methods=['GET'])
@produces(mime.JSON)
def get_latest_msgs():
    getter = model.Message.get_latest
    return get_msgs_json(request, getter, True)

@app.route('/api/msgs/<user>', methods=['GET'])
@produces(mime.JSON)
def get_user_msgs(user):
    getter = lambda offset, limit: model.Message.get_from_user(user, offset, limit)
    return get_msgs_json(request, getter, True)

@app.route('/api/timeline/<user>', methods=['GET'])
@produces(mime.JSON)
@authenticated_only
def get_timeline(username, user):
    if username == user:
        getter = lambda offset, limit: model.Message.get_user_timeline(user, offset, limit)
        return get_msgs_json(request, getter, True)
    else:
        return status_response(403, ok=False, reason="unauthorized")

@app.route('/api/user', methods=['POST'])
@consumes(mime.JSON)
@produces(mime.JSON)
def create_user():
    msgdct  = flask.json.loads(request.data)
    username = msgdct['username']
    password = msgdct['password']

    if model.User.get_users_count(settings.MAX_USERS) >= settings.MAX_USERS:
        return status_response(400, ok=False, reason="max users reached")
    elif model.User.get_by_username(username) is not None:
        return status_response(400, ok=False, reason="user already exists")
    else:
        hashed_password = utils.encrypt(password, settings.SALT)
        user = model.User(username=username, password=hashed_password)
        user.put()

        return flask.jsonify(username=username)

## PHSB code

@app.route('/api/notify/<user>', methods=['POST'])
def receive_notification(user):
    app.logger.info("receiving notification to user %s", user)
    data = request.stream.read()

    secret = request.args.get('hub.secret', None)

    if secret is None:
        return response(400, 'expected secret', mime.TEXT)
    else:
        signature = hmac.new(secret, data).hexdigest()
        server_signature = request.headers.get('X-Hub-Signature', None)

        app.logger.info("secret %s sign %s server sign %s" % (secret,
            signature, server_signature))

        if signature != server_signature:
            return response(400, 'invalid hub signature', mime.TEXT)
        else:
            for msg in parse_messages(data, user):
                msg.save()
                app.logger.debug(str(msg))

            return "thanks!"

@app.route('/api/notify/<user>', methods=['GET'])
def confirm_subscription(user):
    challenge = request.args.get('hub.challenge', None)
    topic = request.args.get('hub.topic', None)
    mode = request.args.get('hub.mode', None)

    if mode == "subscribe" and challenge is not None:
        subscription = model.Subscription.get_by_subscriber_and_topic(user,
                topic)

        if subscription is not None:
            return challenge
        else:
            app.logger.error("trying to confirm invalid subscription %s %s" %
                    (user, topic))
            return response(404, 'invalid subscription confirmation', mime.TEXT)
    else:
        return response(404, 'invalid subscription confirmation', mime.TEXT)

app.secret_key = settings.SECRET_KEY

if __name__ == "__main__":
    app.run(debug=True)
