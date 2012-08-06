chachara
========

a small picoblogging webapp using flask/gae/pubsubhubbub 

gae can be changed for any other hosting as long as model.py is implemented
for that backend.

clone::

        git clone https://github.com/marianoguerra/chachara.git

setup::

        cd chachara
        # init virtualenv
        virtualenv --distribute chachara 
        # activate virtualenv
        cd chachara
        source bin/activate

install dependencies::

        pip install --ignore-installed -t . -r requirements.txt

create a settings module, base on this one, change the things between <>::

::

        import os

        DEBUG = os.environ.get('SERVER_SOFTWARE', 'Dev').startswith('Dev')
        SECRET_KEY = '<secret key here>'
        SALT = '<salt here>'
        MAX_USERS = 5

        if DEBUG:
            HUB_URL = "http://localhost:8082/"
        else:
            HUB_URL = "http://pubsubhubbub.appspot.com/"

start server::

        path/to/google_appengine/dev_appserver.py . -p 8080 --datastore_path=/tmp/chachara8080
        # start other if you want
        path/to/google_appengine/dev_appserver.py . -p 8081 --datastore_path=/tmp/chachara8081

open your browser and go to http://localhost:8080/

get pubsubhubbub server::

        svn checkout http://pubsubhubbub.googlecode.com/svn/trunk/ pubsubhubbub

start it::

        path/to/google_appengine/dev_appserver.py pubsubhubbub/hub/ -p 8082 --datastore_path=/tmp/pshb8082


create some users::

        curl -X POST http://localhost:8080/api/user --data-binary '{"username": "mariano", "password": "secret"}' -H 'Content-type: application/json' -H "Accept: application/json"

        curl -X POST http://localhost:8081/api/user --data-binary '{"username": "ignacio", "password": "secret"}' -H 'Content-type: application/json' -H "Accept: application/json"

license
-------

AGPL v3

