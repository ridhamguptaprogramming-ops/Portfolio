# Portfolio Backend

This workspace includes a lightweight Python backend for the To‑Do section of the portfolio.

## Requirements

- Python 3.8+ (Flask + flask-cors dependencies)

## Installing dependencies

```bash
python -m venv venv          # create virtual environment
source venv/bin/activate     # macOS/Linux
pip install flask flask-cors
```

## Running the server

```bash
python server.py
```

The backend listens on `http://127.0.0.1:5000` by default.
It provides a simple JSON API:

- `GET /tasks` – list tasks
- `POST /tasks` – add a task (`{text: string}`)
- `PUT /tasks/<id>` – update completion (`{completed: bool}`)
- `DELETE /tasks/<id>` – remove task

The frontend (`index.html` + `script.js`) has been updated to communicate with this API instead of using localStorage. 

> **Important:**
> The page must be served over HTTP (e.g. via `python -m http.server` in this folder) rather than opened directly with `file://` so that the `fetch` requests to `localhost:5000` succeed.  
> Once the server is running, navigate to `http://127.0.0.1:8000` (or whichever port you choose) to use the todo list; it will persist tasks on the backend.

