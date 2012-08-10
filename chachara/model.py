from google.appengine.ext import db

class Base(db.Model):
    def toJSON(self):
        attrs = {}

        for key in self.ATTRS:
            attrs[key] = getattr(self, key)

        attrs["_id"] = str(self.key())

        return attrs

class Message(Base):
    owner     = db.StringProperty()
    username  = db.StringProperty()
    msg       = db.StringProperty(multiline=True)
    timestamp = db.IntegerProperty()

    ATTRS = ["username", "msg", "timestamp"]

    @classmethod
    def get_user_timeline(cls, username, offset=0, limit=100):
        """
        return all the messages that are owned by a user
        """
        return cls.all().filter('owner =', username).order("-timestamp").run(offset=offset, limit=limit)

    @classmethod
    def get_from_user(cls, username, offset=0, limit=100):
        """
        return all the messages from user
        """
        return cls.all().filter('username =', username).order("-timestamp").run(offset=offset, limit=limit)

    @classmethod
    def get_latest(cls, offset=0, limit=100):
        """
        return the latest messages
        """
        return cls.all().order("-timestamp").run(offset=offset, limit=limit)

    @classmethod
    def by_id(cls, id_):
        """
        return message by id
        """
        return cls.get(id_)

class User(Base):
    username  = db.StringProperty()
    password  = db.StringProperty()

    ATTRS = ["username", "password"]

    @classmethod
    def get_by_username(cls, username):
        """
        return user instance that matches the given username
        """
        return cls.all().filter('username =', username).get()

    @classmethod
    def get_by_username_and_password(cls, username, password):
        """
        return user instance that matches the given username and password
        """
        return cls.all().filter('username =', username).filter("password =", password).get()

    @classmethod
    def get_users_count(cls, limit=None):
        """
        return the number of registered users, if limit is specified only
        count until that limit
        """
        return cls.all().count(limit=limit)

class Subscription(Base):
    subscriber = db.StringProperty()
    topic      = db.StringProperty()
    secret     = db.StringProperty()

    ATTRS = ["subscriber", "topic"]

    @classmethod
    def get_by_subscriber(cls, subscriber):
        """
        return subscription instance that matches the given subscriber
        """
        return cls.all().filter('subscriber =', subscriber)

    @classmethod
    def get_by_subscriber_and_topic(cls, subscriber, topic):
        """
        return subscription instance that matches the given subscriber and
        topic
        """
        return cls.all().filter('subscriber =', subscriber).filter("topic =", topic).get()
