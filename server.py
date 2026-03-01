from flask import Flask, jsonify, request # type: ignore
from pathlib import Path
import json
from uuid import uuid4

# allow cross-origin so frontend served from different port can talk to API
from flask_cors import CORS # type: ignore

DATA_FILE = Path(__file__).parent / "tasks.json"
app = Flask(__name__)
CORS(app)


def load_tasks():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text())
        except json.JSONDecodeError:
            return []
    return []


def save_tasks(tasks):
    DATA_FILE.write_text(json.dumps(tasks))


@app.route("/tasks", methods=["GET"])
def get_tasks():
    tasks = load_tasks()
    return jsonify(tasks)


@app.route("/tasks", methods=["POST"])
def add_task():
    data = request.get_json(force=True)
    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    task = {"id": str(uuid4()), "text": text, "completed": False}
    tasks = load_tasks()
    tasks.append(task)
    save_tasks(tasks)
    return jsonify(task), 201


@app.route("/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json(force=True)
    tasks = load_tasks()
    for t in tasks:
        if t.get("id") == task_id:
            t["completed"] = data.get("completed", t.get("completed"))
            save_tasks(tasks)
            return jsonify(t)
    return jsonify({"error": "Not found"}), 404


@app.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    tasks = load_tasks()
    new_tasks = [t for t in tasks if t.get("id") != task_id]
    save_tasks(new_tasks)
    return "", 204


if __name__ == "__main__":
    # simple development server
    app.run(debug=True)
