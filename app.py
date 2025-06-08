import os
from flask import Flask, render_template

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

@app.route("/")
def index():
    return render_template(
        "index.html",
        firebase_api_key=os.environ.get("FIREBASE_API_KEY"),
        firebase_project_id=os.environ.get("FIREBASE_PROJECT_ID"),
        firebase_app_id=os.environ.get("FIREBASE_APP_ID"),
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
