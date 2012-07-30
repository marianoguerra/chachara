import time
import json

import flask
from flask import Flask, redirect, url_for, request
app = Flask(__name__)

import settings

class Message(object):
    def __init__(self, username, msg, timestamp=None):
        self.username = username
        self.msg = msg
        self.timestamp = int(time.time()) if timestamp is None else timestamp

    def toJSON(self):
        return vars(self)

msgs = []

def response(status=200, content=None, content_type="application/json"):
    return flask.Response(response=content, status=status,
            content_type=content_type)

def status_response(status=200, ok=True, reason="ok"):
    content = json.dumps({"ok": ok, "reason": reason})

    return response(status, content)

@app.route("/")
def index():
    return redirect(url_for('static', filename="index.html"))

@app.route('/api/session', methods=['POST'])
def create_session():
    msgdct  = flask.json.loads(request.data)
    username = msgdct['username']
    password = msgdct['password']

    flask.session['username'] = username

    return flask.jsonify(username=username)

@app.route('/api/session', methods=['GET'])
def check_session():
    if 'username' in flask.session:
        return flask.jsonify(username=flask.session['username'])
    else:
        return status_response(401, ok=False, reason="not authenticated")

@app.route('/api/session', methods=['DELETE'])
def delete_session():
    flask.session.pop('username', None)
    return status_response()

@app.route('/api/msg', methods=['POST'])
def create_message():
    if 'username' in flask.session:
        msgdct  = flask.json.loads(request.data)
        username = msgdct['username']
        msg = msgdct['msg']

        message = Message(username, msg)
        msgs.append(message)

        if flask.session['username'] == username:
            return flask.jsonify(**message.toJSON())
        else:
            return status_response(403, ok=False, reason="unauthorized")

    else:
        return status_response(401, ok=False, reason="not authenticated")

@app.route('/api/msgs/<user>', methods=['GET'])
def get_messages(user):
    if 'username' in flask.session:
        username = flask.session['username']

        if username == user:
            return response(content=json.dumps([msg.toJSON() for msg in msgs]))
        else:
            return status_response(403, ok=False, reason="unauthorized")

    else:
        return status_response(401, ok=False, reason="not authenticated")

# TODO: change this
app.secret_key = settings.SECRET_KEY

if __name__ == "__main__":
    app.run(debug=True)
