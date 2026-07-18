# PolyLoop Flask API

Shared Flask backend for the collector and dustbin-owner React apps.

## Setup

```powershell
cd D:\Uni_Projects\zytron\zytron\src\server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` for local overrides. The API uses PostgreSQL through SQLAlchemy and reads connection values from:

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=zytron_db
PG_USER=postgres
PG_PASSWORD=
```

## Database

```powershell
$env:FLASK_APP="run.py"
flask db upgrade
flask seed
```

To migrate existing local SQLite data into PostgreSQL, first run the PostgreSQL migrations, then copy rows from the original SQLite file:

```powershell
python scripts\migrate_sqlite_to_postgres.py --dry-run
python scripts\migrate_sqlite_to_postgres.py
```

The script reads `instance/polyloop.sqlite` by default and does not modify it. If the PostgreSQL tables already contain data and you want a fresh copy, pass `--truncate-postgres`.

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

The React website loads public frontend values from:

```text
../website/config/app-config.js
```

Keep backend-only values, PostgreSQL credentials, Firebase service-account credentials, and server Google Maps keys in the backend environment only.

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

Tests use the PostgreSQL database named by `TEST_DATABASE_URL`, or `PG_TEST_DATABASE` when set. If neither is set, tests use `<PG_DATABASE>_test`.

## Security Notes And Limitations

Implemented: password hashing, expiring JWTs, refresh tokens, token revocation records, CORS configuration, role checks, object-level ownership checks, input validation, server-calculated financial totals, simulated transaction states, and device-secret authentication for smart-bin ingestion.

Remaining limitations: no production rate limiter is installed, refresh tokens are stored client-side for this project, device secret rotation is not implemented, OpenAPI generation is not included, and route distance estimation uses a simple Haversine fallback rather than a paid optimization API.
