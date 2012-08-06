'''utility functions'''

import sha
import urllib
import urllib2

def encrypt(value, salt):
    return sha.sha(value + salt).hexdigest()

# hub.callback=http://localhost:8080/api/notify/marianoguerra&hub.mode=subscribe&hub.secret=&hub.topic=http://localhost:8081/api/msgs/ignacio.xml&hub.verify=sync&hub.verify_token=
def pshb_subscribe(hub, topic, callback, secret, mode="subscribe", verify="async", token=""):
    """
    subscribe to *topic* in *hub*, hub will call *callback* when an update
    happens in *topic*
    """

    data = urllib.urlencode({
        "hub.callback": callback,
        "hub.mode": mode,
        "hub.secret": secret,
        "hub.topic": topic,
        "hub.verify": verify,
        "hub.verify_token": token
    })

    try:
        urllib2.urlopen(hub, data)
    except (IOError, urllib2.HTTPError), e:
        if hasattr(e, 'code') and e.code == 204:
            return True, ""
        else:

            if hasattr(e, 'read'):
                error = e.read()
            else:
                error = ""

            return False, error
