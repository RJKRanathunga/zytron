# PolyLoop Flask API

Shared Flask backend for the collector and dustbin-owner React apps.

## Setup

```powershell
cd D:\Uni_Projects\zytron\zytron\src\server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` for local overrides. The default development database is SQLite at `instance/polyloop.sqlite`; set `DATABASE_URL` to a PostgreSQL URL when needed.

## Database

```powershell
$env:FLASK_APP="run.py"
flask db upgrade
flask seed
```

`flask seed` is idempotent and creates demo users, organizations, materials, collection points, smart bins, compartments, lots, offers, reservations, pickups, route plans, transactions, notifications, messages, demand alerts, and impact snapshots.

Demo accounts, for local development only:

```text
owner@polyloop.demo / PolyLoop123!
collector@polyloop.demo / PolyLoop123!
admin@polyloop.demo / PolyLoop123!
```

## Run

```powershell
$env:FLASK_APP="run.py"
flask run --host 127.0.0.1 --port 5000
```

Health check:

```text
GET http://127.0.0.1:5000/health
```

## Authentication

JWT access and refresh tokens are issued by:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
```

Passwords are hashed with Werkzeug. Access tokens are sent as `Authorization: Bearer <token>`. Logout revokes the presented token. Refresh tokens are supported by `/auth/refresh`.

## Endpoint Groups

All API routes are under `/api/v1`.

Implemented groups:

```text
auth
users/profile/preferences/dashboard
dashboard/collector
dashboard/owner
materials
collection-points
bins/compartments/alerts
device-heartbeats
device-events
lots/publish/withdraw
offers/accept/reject/withdraw
reservations/confirm/cancel
pickups/schedule/start-route/check-in/verify-weight/complete/cancel
routes/stops/reorder/start/complete
demand-alerts/matches
transactions/earnings/spending/mark-paid
notifications
message-threads/messages
impact
```

Responses use:

```json
{ "data": {}, "meta": {} }
```

Errors use:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request could not be processed.",
    "details": {}
  }
}
```

## Frontend Configuration

Both React apps include `.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

Start the apps after the Flask API is running:

```powershell
cd D:\Uni_Projects\zytron\zytron\src\collector-website
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173

cd D:\Uni_Projects\zytron\zytron\src\owner-website
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

## Tests

```powershell
cd D:\Uni_Projects\zytron\zytron\src\server
.venv\Scripts\Activate.ps1
python -m pytest
```

Tests use an isolated in-memory SQLite database.

## Security Notes And Limitations

Implemented: password hashing, expiring JWTs, refresh tokens, token revocation records, CORS configuration, role checks, object-level ownership checks, input validation, server-calculated financial totals, simulated transaction states, and device-secret authentication for smart-bin ingestion.

Remaining limitations: no production rate limiter is installed, refresh tokens are stored client-side for this project, device secret rotation is not implemented, OpenAPI generation is not included, and route distance estimation uses a simple Haversine fallback rather than a paid optimization API.
