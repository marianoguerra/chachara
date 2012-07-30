from flask import Flask, redirect, url_for
app = Flask(__name__)

@app.route("/")
def hello():
    return redirect(url_for('static', filename="index.html"))

if __name__ == "__main__":
    app.run()
