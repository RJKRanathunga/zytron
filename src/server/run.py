from app import create_app
from flask import request

app = create_app()

@app.before_request
def log_request():
    print(
        f"[REQUEST] {request.method} {request.path} "
        f"origin={request.headers.get('Origin')} "
        f"has_auth={bool(request.headers.get('Authorization'))}",
        flush=True,
    )

@app.after_request
def log_response(response):
    print(
        f"[RESPONSE] {request.method} {request.path} "
        f"status={response.status_code}",
        flush=True,
    )
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
