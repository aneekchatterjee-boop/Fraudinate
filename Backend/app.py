from flask import Flask, jsonify
from flask_cors import CORS

from database import init_db


app = Flask(__name__)
CORS(app)

# Initialize the database when the backend starts
init_db()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Fraudinate Backend"
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)