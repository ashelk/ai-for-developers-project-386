# Call Calendar — Integration tests (Playwright)

End-to-end tests that drive the OpenUI5 frontend in a real Chromium
browser against the Spring Boot backend. They verify that the contract,
the UI, the business rules and the routing all line up — not just that
each part works in isolation.

## What the tests cover

The three specs in `tests/` map to the three Hexlet user scenarios that
matter for this step:

| File                            | Scenario                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tests/booking.spec.ts`         | **Main booking path.** Guest lands on the public list → opens *Quick intro* → picks today's first free slot → fills name + email + notes → submits → lands on the confirmation page. The booking is then verified to exist on `GET /admin/bookings`. |
| `tests/admin-view.spec.ts`      | **Admin visibility.** After a guest books a *Deep dive* through the UI, the owner navigates to `/admin/bookings` and finds that booking in the table with the right guest data and event-type label. |
| `tests/slot-conflict.spec.ts`   | **Slot conflict.** Guest opens *Quick intro* and selects the slot the UI offers first; a competing booking takes that exact slot via the API; the guest's submit then receives `409 slot_conflict` and the UI surfaces "That slot was just booked…" while staying on the booking page. |

Helpers shared across specs live in `tests/helpers.ts`
(`gotoPublicEventTypes`, `openEventType`, `pickFirstSlotOnToday`,
`fillBookingForm`, `fetchEventTypes`, `fetchSlots`, `bookViaApi`,
`uniqueEmail`).

## Stack

| Layer          | Tool                                                          |
| -------------- | ------------------------------------------------------------- |
| Test runner    | `@playwright/test` 1.50.x                                     |
| Language       | TypeScript                                                    |
| Browser        | Chromium (headless)                                           |
| Stack under test | Backend on `:8081` (`mvn spring-boot:run`), Frontend on `:8080` (`ui5 serve`) |
| Process control | Playwright `webServer` config — boots both processes, waits for HTTP responsiveness, kills them when the suite ends |

## Running locally

```bash
# From calendar/e2e
npm install
npx playwright install chromium   # first time only
npm test                          # headless (~15 seconds locally)

# Helpful variants
npm run test:headed               # see the browser
npm run test:ui                   # Playwright UI mode — best for iterating
npm run report                    # open the HTML report from the last run
```

If you already have the backend and frontend running (`mvn spring-boot:run`
in `backend/` and `npm run serve` in `frontend/`), Playwright detects them
via `reuseExistingServer: !CI` and skips its own boot — faster iteration
while debugging a single failing test.

## Test isolation strategy

The backend keeps its data in memory and is shared across all tests in a
suite, so the suite runs **`fullyParallel: false, workers: 1`** to keep
slot timelines predictable. Each test additionally uses a unique guest
email (`uniqueEmail(prefix)`) so created bookings never collide
semantically with each other or with previous local runs.

## CI

`.github/workflows/e2e.yml` runs the suite on every push to `main` and
every pull request:

1. Set up Java 21 (Temurin) with Maven cache.
2. Set up Node 20 with npm cache for `frontend/` and `e2e/`.
3. `mvn package` the backend so the `spring-boot:run` invoked by
   Playwright's `webServer` boots quickly.
4. `npm ci` in `frontend/` and `npm run types:generate`.
5. `npm ci` in `e2e/`.
6. Cache `~/.ui5/framework` and `~/.cache/ms-playwright` between runs.
7. `npx playwright install --with-deps chromium`.
8. `npx playwright test` — Playwright starts both servers, runs the
   tests, kills the servers.
9. On failure, upload `playwright-report/` and `test-results/` as
   artifacts (HTML report + traces + videos + screenshots).

## Notes / gotchas

- UI5 keeps previous views in the DOM (just hidden) when the router
  swaps pages. Naïve `getByText(...)` can find stale instances; tests
  scope by visible regions or assert on URL hash changes
  (`expect(page).toHaveURL(/confirmation/)`) instead.
- The first hit of `gotoPublicEventTypes` is slow because the UI5
  framework bootstraps and downloads the runtime; the helper allows up
  to 60 seconds for the landing page to appear.
- Slot labels render in the **browser's locale** (e.g. `01:30 AM` on
  Playwright's default `en-US` Chromium). Tests therefore assert on the
  presence of a `HH:MM` pattern rather than on an exact string.
