# Call Calendar — Frontend

OpenUI5 + TypeScript frontend for the **Call Calendar** booking service.
The UI is implemented as a separate part of the application and talks
to the backend **exclusively through the OpenAPI contract** defined in
the sibling `tsp-output/schema/openapi.yaml` (generated from `main.tsp`).

## Stack

| Layer            | Tool                                                                |
| ---------------- | ------------------------------------------------------------------- |
| Framework        | [OpenUI5](https://openui5.org/) 1.131.x — open-source flavor of SAPUI5 |
| Language         | TypeScript 5.x                                                      |
| Build / dev      | [UI5 Tooling](https://sap.github.io/ui5-tooling/) 4.x + `ui5-tooling-transpile` |
| Views            | XML views (`webapp/view/**`)                                        |
| Controllers      | TypeScript (`webapp/controller/**`)                                 |
| Theme            | `sap_horizon` (current Fiori 3 visual identity)                     |
| Routing          | UI5 native router declared in `manifest.json`                       |
| State            | `sap.ui.model.json.JSONModel` per view + a small component-level model for the post-booking confirmation |
| HTTP             | Native `fetch` wrapped in a typed client (`webapp/model/Api.ts`)    |
| API types        | [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript) generates `webapp/types/api.ts` from the OpenAPI document |
| Mock backend     | [Prism](https://github.com/stoplightio/prism) CLI — dynamic mock served on `:4010` |

## Running locally

```bash
# 1. Install deps
npm install

# 2. Generate API types from the OpenAPI contract.
#    Re-run whenever main.tsp changes upstream and openapi.yaml is regenerated.
npm run types:generate

# 3. Start the mock backend + UI5 dev server together.
npm run dev
# Opens http://localhost:8080 — UI talks to Prism at http://localhost:4010.
```

Separate scripts are also available:

| Script               | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `npm run mock`       | Prism mock server only, port 4010, `--dynamic --cors`            |
| `npm run ui5`        | UI5 dev server only, port 8080                                   |
| `npm run dev`        | Both, in parallel, via `concurrently`                            |
| `npm run build`      | Production build → `dist/`                                       |
| `npm run types:generate` | (Re)generate `webapp/types/api.ts` from `openapi.yaml`       |
| `npm run lint:ts`    | TypeScript type-check (`tsc --noEmit`)                           |

When a real backend exists, point the UI at it by setting
`window.__CALENDAR_API_BASE__` before the bootstrap (e.g. in
`index.html`) — see `webapp/model/Api.ts`.

## Project layout

```
frontend/
├── package.json
├── tsconfig.json
├── ui5.yaml
└── webapp/
    ├── index.html              # bootstrap
    ├── index.ts                # creates the ComponentContainer
    ├── manifest.json           # UI5 app descriptor + routing
    ├── Component.ts            # root UIComponent
    ├── i18n/i18n.properties    # all user-facing strings
    ├── css/style.css           # a handful of layout helpers
    ├── types/api.ts            # generated from openapi.yaml — do NOT edit
    ├── model/Api.ts            # typed REST client + ApiError
    ├── controller/
    │   ├── BaseController.ts   # shared helpers (router, i18n, error mapping)
    │   ├── App.controller.ts
    │   ├── public/
    │   │   ├── EventTypes.controller.ts
    │   │   ├── EventTypeDetail.controller.ts
    │   │   └── Confirmation.controller.ts
    │   └── admin/
    │       ├── EventTypes.controller.ts
    │       └── Bookings.controller.ts
    └── view/
        ├── App.view.xml
        ├── public/
        │   ├── EventTypes.view.xml
        │   ├── EventTypeDetail.view.xml
        │   └── Confirmation.view.xml
        └── admin/
            ├── EventTypes.view.xml
            ├── EventTypeDialog.fragment.xml
            └── Bookings.view.xml
```

## Pages and the contract operations they consume

| Page                                  | Route                                       | Contract operations                                                                              |
| ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Public — event types list             | `/`                                         | `GET /public/event-types`                                                                        |
| Public — event type detail + booking  | `/event-types/{eventTypeId}`                | `GET /public/event-types/{id}`, `GET /public/event-types/{id}/slots`, `POST /public/event-types/{id}/bookings` |
| Public — confirmation                 | `/event-types/{eventTypeId}/confirmation`   | none (reads the just-created booking from a transient component-level model)                     |
| Admin — event types CRUD              | `/admin/event-types`                        | `GET /admin/event-types`, `POST /admin/event-types`, `PATCH /admin/event-types/{id}`, `DELETE /admin/event-types/{id}` |
| Admin — upcoming bookings             | `/admin/bookings`                           | `GET /admin/bookings`                                                                            |

Every error response code in the contract (400, 404, 409, 422) is
mapped to a localized message in `BaseController.handleApiError`.

## Error handling

The typed client (`webapp/model/Api.ts`) throws an `ApiError` for any
non-2xx response. The base controller maps known `code` values to
user-facing messages from `i18n.properties`:

| Server `code`           | UI message key            |
| ----------------------- | ------------------------- |
| `slot_conflict`         | `errorSlotConflict`       |
| `slot_out_of_window`    | `errorSlotOutOfWindow`    |
| `validation_error`      | `errorValidation`         |
| (status 404)            | `errorNotFound`           |
| anything else           | `errorGeneric`            |

## Known limitations of the Prism mock

Prism with `--dynamic` generates random valid OpenAPI responses, which
means:

- `durationMinutes` may not be a multiple of 30 (Prism does not enforce
  the `multipleOf` description from the schema text — it only honors
  `minimum`/`maximum`).
- Slot start times are random `date-time`s, not aligned to `:00 / :30`
  and not necessarily inside the 14-day window.
- POST / PATCH / DELETE return random objects rather than persisting
  state — the next GET will not reflect the change.

These quirks are fine for verifying that the UI compiles, renders and
plays nicely with the contract. For deeper testing, switch Prism into
static mode and supply example payloads, or wait for the real backend.
