# Call Calendar

### Hexlet tests and linter status:
[![Actions Status](https://github.com/ashelk/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ashelk/ai-for-developers-project-386/actions)

A Cal.com-inspired call-booking service. A single owner publishes the types
of calls they accept; anyone can browse the available time slots in the next
14 days and book one. There is **no authentication** in this iteration —
auth and per-user accounts are deliberately out of scope so the project can
focus on the API contract, the front-end, and the back-end implementation.

The project is split into four independent parts, all aligned to a
single source of truth — the API contract:

- **Contract** (this directory) — TypeSpec spec and the generated
  OpenAPI document.
- **`frontend/`** — OpenUI5 + TypeScript SPA.
  See [`frontend/README.md`](./frontend/README.md).
- **`backend/`** — Spring Boot 3 service.
  See [`backend/README.md`](./backend/README.md).
- **`e2e/`** — Playwright integration tests that drive the UI against
  the backend in a real browser.
  See [`e2e/README.md`](./e2e/README.md).

The frontend and backend are developed independently against the
contract and never depend on each other's internals. The e2e suite
spans both — it is the only place where they have to match in practice.

## Repository layout

```
.
├── main.tsp                    # source of truth: TypeSpec spec
├── tspconfig.yaml              # TypeSpec compiler config
├── package.json                # npm scripts + TypeSpec deps
├── tsp-output/schema/openapi.yaml  # generated OpenAPI 3.1 document
├── frontend/                   # OpenUI5 + TypeScript UI
├── backend/                    # Spring Boot 3 service
├── e2e/                        # Playwright integration tests
├── Dockerfile                  # production image: SPA + API in a single container
├── render.yaml                 # Render.com blueprint for one-click deploy
└── .github/workflows/e2e.yml   # CI: runs the e2e suite on every PR
```

## Deployed instance

> **Public URL:** <https://call-calendar.onrender.com>

The service listens on the port given by the `PORT` env var; the
deployed image serves the SPA at `/` and the API at `/admin/**` and
`/public/**` on the same origin.

## Quick start — full stack

```bash
# 1. Backend on :8081 (in-memory; seeds two demo event types on startup)
cd backend && mvn spring-boot:run

# 2. Frontend on :8080. The default API base URL is http://localhost:8081
#    (the backend). For contract-level work without the backend running,
#    start Prism with `npm run mock` and set
#    window.__CALENDAR_API_BASE__ = "http://localhost:4010" in the browser.
cd frontend && npm install && npm run types:generate && npm run ui5

# 3. End-to-end tests against the live stack (boots both servers itself).
cd e2e && npm install && npx playwright install chromium && npm test

# 4. Production image (single container — SPA + API together, listens on PORT).
docker build -t call-calendar .
docker run --rm -p 8080:8080 -e PORT=8080 call-calendar
# Open http://localhost:8080
```

## Production image

The root `Dockerfile` is a three-stage build:

1. **Frontend stage** (`node:22`): installs the TypeSpec compiler, regenerates the OpenAPI document from `main.tsp`, then installs the UI5 frontend deps, regenerates the TS types from the contract, and runs `ui5 build --include-all-dependencies` to produce a deployable SPA bundle that includes the framework.
2. **Backend stage** (`maven:3.9-eclipse-temurin-21`): builds the Spring Boot fat jar, slotting the SPA bundle from stage 1 into `src/main/resources/static/` so the same Spring server serves the UI at `/` and the API under `/admin` and `/public`.
3. **Runtime stage** (`eclipse-temurin:21-jre`): copies the jar, drops to a non-root user, and starts the jar with `java -jar`. Honours `PORT` via the Spring Boot property `server.port: ${PORT:8081}`.

```bash
docker build -t call-calendar .
docker run --rm -p 9000:9000 -e PORT=9000 call-calendar
# → SPA + API on http://localhost:9000
```

## Deploying to Render

`render.yaml` at the repository root is a [Render Blueprint](https://render.com/docs/blueprint-spec) that describes a single Docker web service.

1. Push the repository to GitHub.
2. In Render: **New +** → **Blueprint** → select this repository → **Apply**.
3. Render reads `render.yaml`, builds the image from the root `Dockerfile`, injects `PORT`, and exposes the service on a public URL.
4. Health is checked against `/admin/event-types` (the seeded data makes this return `200` on every cold start).
5. Once deployed, paste the URL into the **Deployed instance** section above so the README links to the live service.

The same image works on Heroku, Fly.io, Cloud Run, Hexlet's CI checker — anywhere that runs a Docker image and sets `PORT`.

## How to (re)generate the OpenAPI document

```bash
npm install
npm run build      # compiles main.tsp -> tsp-output/schema/openapi.yaml
npm run watch      # recompile on every change
npm run format     # tsp format **/*.tsp
```

## Domain model

There are two roles. Neither requires authentication right now.

- **Owner.** A single, pre-configured profile. The owner is implicit:
  there is no `/owner` endpoint and the owner is not part of any payload.
  Conceptually the owner owns every event type and every booking.
- **Guest.** Anyone who lands on the public side. A guest is identified
  by **email**, which is the primary identifier and is reserved as the
  future login for an external auth provider.

### Entities

| Entity      | Fields                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `EventType` | `id`, `name`, `description`, `durationMinutes`                                                          |
| `Slot`      | `startTime`, `endTime` — computed, never stored                                                         |
| `Booking`   | `id`, `eventTypeId`, `startTime`, `endTime`, `guestName`, `guestEmail`, `guestNotes?`, `createdAt`      |

### Rules enforced by the server

1. `EventType.durationMinutes` is a positive multiple of 30 (30…480).
2. Slot start times are aligned to `:00` or `:30` UTC.
3. A booking occupies `[startTime, startTime + durationMinutes)`.
4. The bookable window is `[now, now + 14 days)`.
5. **Two bookings may never overlap**, even across different event types.
6. Guest must supply non-empty `guestName` and a valid `guestEmail`;
   `guestNotes` is optional.

### Owner scenarios

- Create / list / read / update / delete event types.
- View all upcoming bookings in one chronological list.

### Guest scenarios

- Browse the list of event types and read each one's details.
- Open an event type and request its free slots inside the 14-day window.
- Pick a free slot and submit a booking with name, email, optional notes.

## Scenario → endpoint coverage

Every scenario from the project brief maps to a concrete operation in
`main.tsp`. If something is added to the scenarios, the spec must change
first; the implementations follow.

| Scenario                                                | HTTP                                              | Status codes               |
| ------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| Owner: list event types                                 | `GET    /admin/event-types`                       | 200                        |
| Owner: create event type                                | `POST   /admin/event-types`                       | 201 / 400                  |
| Owner: read event type                                  | `GET    /admin/event-types/{id}`                  | 200 / 404                  |
| Owner: update event type                                | `PATCH  /admin/event-types/{id}`                  | 200 / 400 / 404            |
| Owner: delete event type                                | `DELETE /admin/event-types/{id}`                  | 204 / 404                  |
| Owner: see upcoming bookings (all types, chronological) | `GET    /admin/bookings`                          | 200                        |
| Guest: browse event types                               | `GET    /public/event-types`                      | 200                        |
| Guest: read one event type                              | `GET    /public/event-types/{id}`                 | 200 / 404                  |
| Guest: see free slots in the 14-day window              | `GET    /public/event-types/{id}/slots`           | 200 / 404                  |
| Guest: book a free slot                                 | `POST   /public/event-types/{id}/bookings`        | 201 / 400 / 404 / 409 / 422 |

### Why each error code

- **400 `validation_error`** — payload is malformed (e.g. empty `guestName`,
  invalid email, `durationMinutes` not a positive multiple of 30).
- **404** — referenced entity does not exist (`eventTypeId`, `bookingId`).
- **409 `slot_conflict`** — requested slot overlaps an existing booking.
- **422 `slot_out_of_window`** — `startTime` is outside `[now, now + 14d)`
  or not aligned to a `:00 / :30` boundary.

## Task prompt given to the AI agent

The work in this step was driven by the prompt below. It is recorded here
so that any future change to the contract can reuse the same framing —
update the prompt, re-run the agent, update the spec, regenerate the
OpenAPI document.

> **Goal.** Produce a TypeSpec specification (`main.tsp`) that fixes the
> HTTP API contract for a Cal.com-inspired call-booking service. The spec
> is the single source of truth for both front-end and back-end teams.
>
> **Roles.** Owner (single, implicit, no auth) manages event types and
> sees upcoming bookings. Guest (no auth, identified by email) browses
> event types, picks a free slot in the next 14 days, and books a call.
>
> **Required entities.** `EventType { id, name, description, durationMinutes }`,
> `Slot { startTime, endTime }` (computed, not stored),
> `Booking { id, eventTypeId, startTime, endTime, guestName, guestEmail, guestNotes?, createdAt }`.
>
> **Required rules.** Duration is a positive multiple of 30 (30…480).
> Slots are aligned to `:00 / :30` UTC. Bookings cannot overlap, even
> across different event types. The bookable window is `[now, now + 14d)`.
> Guest must supply name + email; notes optional.
>
> **Required endpoints.** Split into `/admin` (owner) and `/public`
> (guest) namespaces. Owner: CRUD on `/admin/event-types`, list on
> `/admin/bookings`. Guest: list & read on `/public/event-types`, free
> slots on `/public/event-types/{id}/slots`, create booking on
> `/public/event-types/{id}/bookings`.
>
> **Required error model.** A typed error payload (`code`, `message`)
> with distinct codes for `validation_error`, `slot_conflict`,
> `slot_out_of_window`.
>
> **Output.** A single `main.tsp` plus a `tspconfig.yaml` that emits
> OpenAPI 3.1 to `tsp-output/schema/openapi.yaml`. The spec must compile
> with zero warnings under `@typespec/compiler` 1.x.

## What this step does *not* cover

Intentionally deferred:

- Authentication, owner accounts, multi-tenant.
- Owner-defined working hours, blackout periods, timezones.
- Email notifications, calendar integrations.
- Pagination on bookings (not needed for a 14-day horizon).
- Rescheduling / cancellation by the guest.

These are out of scope for this step. When they are added, update
`main.tsp` first, regenerate `openapi.yaml`, and only then change the
client and the server.
