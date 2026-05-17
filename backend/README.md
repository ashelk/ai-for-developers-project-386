# Call Calendar — Backend

Spring Boot implementation of the **Call Calendar** API. The implementation
follows the OpenAPI contract from `../tsp-output/schema/openapi.yaml` and
enforces every booking rule on the server side. Data lives in memory and
is reset on every restart.

## Stack

| Layer            | Tool                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Language         | Java 21 (LTS)                                                        |
| Framework        | Spring Boot 3.5.x — `spring-boot-starter-web`, `spring-boot-starter-validation` |
| Validation       | Jakarta Bean Validation + a tiny custom `@MultipleOf` constraint     |
| JSON             | Jackson (default Spring Boot configuration; ISO-8601 for `Instant`)  |
| Storage          | In-memory: `LinkedHashMap` for event types (preserves owner order), `ConcurrentHashMap` for bookings |
| Concurrency      | Booking creation is `synchronized` so two simultaneous POSTs cannot both pass the conflict check |
| Build            | Maven 3.9+                                                           |
| Container        | Multistage `Dockerfile` (Maven build image → JRE runtime image)      |

## Running locally

```bash
# From calendar/backend
mvn spring-boot:run
# → http://localhost:8081
```

A fresh start seeds two demo event types — *Quick intro* (30 min) and
*Deep dive* (60 min) — so the UI has something to render immediately.
Disable via `--calendar.seed-demo-data=false`.

```bash
# Run as a packaged jar
mvn -DskipTests package
java -jar target/backend-0.1.0.jar
```

For a production-style image that bundles **both** the backend and the
OpenUI5 frontend in a single container (the one used by `render.yaml`
and by Hexlet's CI checker), see the root `Dockerfile` and the
**Production image** section of the top-level [README](../README.md).

## Project layout

```
backend/
├── pom.xml
├── .gitignore
└── src/main/
    ├── resources/application.yaml
    └── java/com/calendar/
        ├── CalendarApplication.java
        ├── config/
        │   ├── WebConfig.java          # CORS + Clock bean
        │   └── DemoDataSeeder.java     # ApplicationRunner with two seed event types
        ├── domain/                     # EventType, Booking, Slot — plain records
        ├── dto/                        # request/response payloads
        ├── exception/                  # NotFound / SlotConflict / SlotOutOfWindow
        ├── repository/                 # In-memory stores
        ├── service/
        │   ├── EventTypeService.java   # CRUD
        │   ├── SlotService.java        # 30-min grid, 14-day window, overlap detection
        │   └── BookingService.java     # orchestrates rules + persistence
        ├── validation/                 # @MultipleOf + validator
        └── web/                        # 3 controllers + RestControllerAdvice
```

## Business rules enforced

Every rule from the contract is enforced server-side:

1. `EventType.durationMinutes` is `30 ≤ x ≤ 480` **and** a multiple of 30.
   Validated by `@Min`, `@Max`, `@MultipleOf` on the request DTO.
2. Slot start times must be aligned to `:00` or `:30` UTC, zero seconds /
   nanoseconds. Enforced in `BookingService.create` →
   `SlotService.isAlignedToSlotGrid`. Violation → `422 slot_out_of_window`.
3. Slot start time must lie in `[now, now + 14 days)`. Enforced in
   `SlotService.isWithinBookingWindow`. Violation → `422 slot_out_of_window`.
4. **No two bookings may overlap** — even across different event types.
   Enforced in `SlotService.wouldConflict`, which checks every existing
   booking. Conflict → `409 slot_conflict`.
5. Booking creation is `synchronized` so concurrent requests cannot
   both pass the conflict check and produce overlapping bookings.
6. `guestName` non-empty, `guestEmail` is a well-formed email, sizes
   bounded — Bean Validation. Violation → `400 validation_error` with
   per-field details.

## Error responses

| Situation                                    | HTTP | Body `code`            |
| -------------------------------------------- | ---- | ---------------------- |
| Event type / booking not found               | 404  | `not_found`            |
| Slot overlaps existing booking               | 409  | `slot_conflict`        |
| Slot outside window or misaligned            | 422  | `slot_out_of_window`   |
| Request body fails validation                | 400  | `validation_error` (with `details`) |
| Path variable type mismatch / unreadable body| 400  | `validation_error`     |

All are produced by `web/ApiExceptionHandler.java`.

## Slot algorithm

`SlotService.availableSlotsFor(eventType, from, to)` is the only piece of
algorithmic logic in the service. Given the event type's duration and an
optional `[from, to)` range:

1. Clamp the range to `[now, now + 14 days)`.
2. Round `from` up to the next `:00 / :30` boundary (`ceilToSlotBoundary`).
3. From that cursor, step forward by 30 minutes at a time, ending each
   candidate slot at `cursor + durationMinutes`.
4. For each candidate, skip it if it overlaps **any** existing booking.
5. Stop when the cursor would land at or after the range end.

Concretely: a 30-min event type with an empty calendar in a 14-day
window produces exactly `14 × 48 = 672` slots; a 60-min event type with
no bookings produces `14 × 48 = 672` slots whose ends overlap, since
slot starts are still every 30 minutes.

## Connecting the frontend

The frontend lives in `../frontend` and reads `window.__CALENDAR_API_BASE__`
to choose its API origin (default in source is the Prism mock on
`localhost:4010`). To point the UI at this backend, either:

- **One-off in the browser:** `window.__CALENDAR_API_BASE__ = "http://localhost:8081"` in the dev tools console, then reload; **or**
- **Permanent:** change `DEFAULT_BASE_URL` in `../frontend/webapp/model/Api.ts` from `http://localhost:4010` to `http://localhost:8081`.

CORS already allows the UI5 dev server (`http://localhost:8080`) and the
Prism port (`http://localhost:4010`); add more origins to
`calendar.allowed-origins` in `application.yaml` if you serve the
frontend elsewhere.

## Smoke-test cheatsheet

```bash
B=http://localhost:8081
EID=$(curl -sS $B/admin/event-types | jq -r '.[0].id')
SLOT=$(curl -sS $B/public/event-types/$EID/slots | jq -r '.[0].startTime')

# Create a booking
curl -sS -X POST $B/public/event-types/$EID/bookings \
  -H 'Content-Type: application/json' \
  -d "{\"startTime\":\"$SLOT\",\"guestName\":\"Alice\",\"guestEmail\":\"a@example.com\"}"

# Re-book the same slot → 409 slot_conflict
curl -sS -X POST $B/public/event-types/$EID/bookings \
  -H 'Content-Type: application/json' \
  -d "{\"startTime\":\"$SLOT\",\"guestName\":\"Bob\",\"guestEmail\":\"b@example.com\"}"

# Misaligned slot → 422 slot_out_of_window
curl -sS -X POST $B/public/event-types/$EID/bookings \
  -H 'Content-Type: application/json' \
  -d '{"startTime":"2026-05-20T10:17:00Z","guestName":"X","guestEmail":"x@y.com"}'

# Bad email → 400 validation_error with per-field details
curl -sS -X POST $B/public/event-types/$EID/bookings \
  -H 'Content-Type: application/json' \
  -d '{"startTime":"2026-05-20T10:00:00Z","guestName":"X","guestEmail":"oops"}'
```

## What this step does **not** cover

- Persistence — data is in memory and resets on restart, per the
  contract step's explicit constraint.
- Tests — covered in the next Hexlet step.
- Authentication / owner accounts — out of scope for the whole project.
- Background jobs (email confirmations, reminders, etc.).
