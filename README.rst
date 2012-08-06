pip install --ignore-installed -t . -r requirements.txt

svn checkout http://pubsubhubbub.googlecode.com/svn/trunk/ pubsubhubbub
google_appengine/dev_appserver.py pubsubhubbub/hub/ -p 8082 --datastore_path=/tmp/pshb8082

~/src/soft/google_appengine/dev_appserver.py . -p 8080 --datastore_path=/tmp/chachara8080
~/src/soft/google_appengine/dev_appserver.py . -p 8081 --datastore_path=/tmp/chachara8081

curl -X POST http://localhost:8080/api/user --data-binary '{"username": "mariano", "password": "secret"}' -H 'Content-type: application/json' -H "Accept: application/json"

curl -X POST http://localhost:8081/api/user --data-binary '{"username": "ignacio", "password": "secret"}' -H 'Content-type: application/json' -H "Accept: application/json"


