import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using Http;
using Rest;
using OpenAPI;

/**
 * Call Calendar — a Cal.com-inspired booking service.
 *
 * The service has two user roles, both unauthenticated in this iteration:
 *   - Owner: manages event types and views upcoming bookings.
 *   - Guest: browses event types, picks a free slot, books a call.
 *
 * Core rules enforced by the server:
 *   - Slots are aligned to :00 / :30 UTC and exist only within the next 14 days.
 *   - A booking occupies [startTime, startTime + event-type duration).
 *   - No two bookings may overlap, even across different event types.
 *   - Guest is identified by email; email is reserved as the primary identifier
 *     for future authentication via an external provider.
 */
@service(#{ title: "Call Calendar API" })
@info(#{ version: "0.1.0" })
@server("http://localhost:3000", "Local development server")
namespace CallCalendar;

// =====================================================================
// Common scalars
// =====================================================================

/** UUID v4 identifier. */
@format("uuid")
scalar Id extends string;

/**
 * Duration in minutes. Must be a positive multiple of 30
 * (30, 60, 90, …, up to 480). The 30-minute step matches the slot grid.
 */
@minValue(30)
@maxValue(480)
scalar DurationMinutes extends int32;

// =====================================================================
// Errors
// =====================================================================

/** Common error payload returned with 4xx / 5xx responses. */
model ApiError {
  /** Machine-readable error code. */
  code: string;

  /** Human-readable description for developers / logs. */
  message: string;
}

/** Validation failure — typically returned with HTTP 400. */
model ValidationError {
  code: "validation_error";
  message: string;

  /** Per-field error messages, keyed by JSON pointer or field name. */
  details?: Record<string>;
}

/** Slot conflict — returned when the requested interval overlaps an existing booking. */
model SlotConflictError {
  code: "slot_conflict";
  message: string;
}

/** Slot is outside the bookable window (past, or beyond 14 days). */
model SlotOutOfWindowError {
  code: "slot_out_of_window";
  message: string;
}

// Reusable 4xx response envelopes
model NotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ApiError;
}

model BadRequestResponse {
  @statusCode statusCode: 400;
  @body body: ValidationError;
}

model ConflictResponse {
  @statusCode statusCode: 409;
  @body body: SlotConflictError;
}

model UnprocessableResponse {
  @statusCode statusCode: 422;
  @body body: SlotOutOfWindowError;
}

// =====================================================================
// Domain models
// =====================================================================

/** Event type — a kind of call the owner offers (e.g. "30-min intro"). */
model EventType {
  /** Server-assigned identifier. */
  id: Id;

  /** Short human-readable title shown to guests. */
  @minLength(1)
  @maxLength(120)
  name: string;

  /** Free-form description shown on the public event-type page. */
  @maxLength(2000)
  description: string;

  /** Duration of a single booking of this type, in minutes. */
  durationMinutes: DurationMinutes;
}

/** Input payload for creating an event type. */
model EventTypeCreate {
  @minLength(1)
  @maxLength(120)
  name: string;

  @maxLength(2000)
  description: string;

  durationMinutes: DurationMinutes;
}

/** Input payload for partially updating an event type. */
model EventTypeUpdate {
  @minLength(1)
  @maxLength(120)
  name?: string;

  @maxLength(2000)
  description?: string;

  durationMinutes?: DurationMinutes;
}

/** A free 30-minute-aligned slot for a specific event type. */
model Slot {
  /** Slot start, UTC, aligned to :00 or :30. */
  startTime: utcDateTime;

  /** Slot end (= startTime + event-type duration). */
  endTime: utcDateTime;
}

/** A confirmed booking made by a guest. */
model Booking {
  /** Server-assigned identifier. */
  id: Id;

  /** Event type that was booked. */
  eventTypeId: Id;

  /** Start of the booked interval, UTC, aligned to :00 or :30. */
  startTime: utcDateTime;

  /** End of the booked interval (= startTime + event-type duration). */
  endTime: utcDateTime;

  /** Guest's full name as provided in the booking form. */
  guestName: string;

  /** Guest's email — primary identifier for the guest. */
  guestEmail: string;

  /** Optional free-form note the guest left when booking. */
  guestNotes?: string;

  /** Server-assigned creation timestamp. */
  createdAt: utcDateTime;
}

/**
 * Booking with denormalized event-type info — used in the owner's list view
 * so the UI does not need to fetch event types separately.
 */
model BookingWithEventType {
  ...Booking;

  /**
   * Current event-type record. If the event type has been deleted after the
   * booking was created, the server returns the historical snapshot here.
   */
  eventType: EventType;
}

/** Input payload for guest-initiated booking creation. */
model BookingCreate {
  /** Desired slot start time. Must match an available slot. */
  startTime: utcDateTime;

  /** Guest's full name. */
  @minLength(1)
  @maxLength(200)
  guestName: string;

  /** Guest's email. Required; serves as the guest's primary identifier. */
  @format("email")
  @minLength(3)
  @maxLength(254)
  guestEmail: string;

  /** Optional comment / topic for the call. */
  @maxLength(2000)
  guestNotes?: string;
}

// =====================================================================
// Admin API — calendar owner
// =====================================================================

/**
 * Endpoints used by the calendar owner.
 *
 * Authentication is intentionally out of scope for this iteration; in a real
 * deployment these routes must be protected.
 */
@tag("admin")
@route("/admin")
namespace Admin {
  @route("/event-types")
  interface EventTypes {
    /** List all event types, ordered by creation time ascending. */
    @get
    list(): EventType[];

    /** Create a new event type. */
    @post
    create(@body body: EventTypeCreate): {
      @statusCode statusCode: 201;
      @body body: EventType;
    } | BadRequestResponse;

    /** Get one event type by id. */
    @route("/{id}")
    @get
    get(@path id: Id): EventType | NotFoundResponse;

    /** Partially update an event type. */
    @route("/{id}")
    @patch
    update(@path id: Id, @body body: EventTypeUpdate):
      | EventType
      | NotFoundResponse
      | BadRequestResponse;

    /**
     * Delete an event type.
     *
     * Existing bookings of this type are preserved and remain visible in
     * the owner's booking list; their `eventType` field will hold the
     * snapshot captured at booking time.
     */
    @route("/{id}")
    @delete
    delete(@path id: Id): {
      @statusCode statusCode: 204;
    } | NotFoundResponse;
  }

  @route("/bookings")
  interface Bookings {
    /**
     * List upcoming bookings across all event types, ordered by
     * startTime ascending. By default, returns bookings whose
     * startTime falls within [now, now + 14 days).
     */
    @get
    list(
      /** Inclusive lower bound on startTime. Defaults to now. */
      @query from?: utcDateTime,

      /** Exclusive upper bound on startTime. Defaults to now + 14 days. */
      @query to?: utcDateTime,
    ): BookingWithEventType[];
  }
}

// =====================================================================
// Public API — guest
// =====================================================================

/**
 * Endpoints used by guests who browse and book calls.
 * No authentication required.
 */
@tag("public")
@route("/public")
namespace Public {
  @route("/event-types")
  interface EventTypes {
    /** List all event types available for booking. */
    @get
    list(): EventType[];

    /** Get one event type by id. */
    @route("/{id}")
    @get
    get(@path id: Id): EventType | NotFoundResponse;

    /**
     * List available slots for the given event type within the
     * 14-day booking window. Only free slots are returned —
     * occupied slots are omitted from the response.
     *
     * Slot start times are always aligned to :00 or :30 UTC.
     * The slot duration matches the event-type duration.
     */
    @route("/{id}/slots")
    @get
    slots(
      @path id: Id,

      /**
       * Inclusive lower bound, clamped to current time on the server.
       * Defaults to current time.
       */
      @query from?: utcDateTime,

      /**
       * Exclusive upper bound, clamped to current time + 14 days.
       * Defaults to current time + 14 days.
       */
      @query to?: utcDateTime,
    ): Slot[] | NotFoundResponse;

    /**
     * Create a booking for a free slot.
     *
     * Server-side validation:
     *   - 400 if the payload is malformed (bad email, empty name, etc.).
     *   - 404 if the event type does not exist.
     *   - 409 if the slot overlaps another booking.
     *   - 422 if startTime is outside [now, now + 14 days) or not
     *     aligned to a :00 / :30 boundary.
     */
    @route("/{id}/bookings")
    @post
    book(@path id: Id, @body body: BookingCreate): {
      @statusCode statusCode: 201;
      @body body: Booking;
    } | NotFoundResponse | BadRequestResponse | ConflictResponse | UnprocessableResponse;
  }
}
