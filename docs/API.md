# API — Huella

Prefijo `/api`. Puerto 3076.

## Auth

- `POST /api/auth/register` `{ username, email, password }`
- `POST /api/auth/login` `{ identifier | login | usernameOrEmail, password }`
- `GET /api/auth/me`

## Patio

- `GET /api/groups` y `GET /api/groups/:id` incluyen `freeSlotsToday`
- `GET /api/groups/:id/slots?date=`
- `GET /api/addons`
- `GET /api/yard-days/:date`
- `GET /api/dogs` CRUD
- `POST /api/bookings/hold`
- `POST /api/bookings/:id/confirm` → `{ qrSvg, qrUrl }`
- `GET /api/bookings/ticket/:code` público
- `POST /api/staff/check-in` / `check-out` `{ codeOrUrl }`
- `GET /api/staff/pack` / `GET /api/staff/stats`
- `GET /api/health`
- `POST /api/seed`

409 con `{ code, message }` humano: `GROUP_FULL`, `YARD_CLOSED`, `ALREADY_HELD`, `ALREADY_BOOKED`, `DOG_NOT_READY`, `HOLD_EXPIRED`, `ALREADY_CHECKED_IN`, `PICKUP_DENIED`, `CANCEL_WINDOW`.
