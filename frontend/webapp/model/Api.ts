import type { components } from "../types/api";

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    __CALENDAR_API_BASE__?: string;
  }
}

/**
 * Base URL of the backend.
 *
 * The default is environment-aware:
 *   - When the page is served from `localhost:8080` (the UI5 dev server),
 *     fall back to `http://localhost:8081` where the Spring Boot backend
 *     listens by default. This is the standard local-dev split.
 *   - Otherwise (production, single-origin Docker deployment, or
 *     anything served from a non-dev origin), use an empty string so
 *     every request goes to the same origin via a relative URL.
 *
 * Either default can be overridden at runtime with
 * `window.__CALENDAR_API_BASE__ = "..."` — handy when pointing the UI
 * at the Prism mock on `:4010` or at a non-default backend.
 */
function defaultBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const { hostname, port } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalhost && port === "8080") {
    return "http://localhost:8081";
  }
  return "";
}

function baseUrl(): string {
  return window.__CALENDAR_API_BASE__ ?? defaultBaseUrl();
}

// =====================================================================
// Re-exported domain types — single source of truth is the OpenAPI spec.
// =====================================================================

export type EventType = components["schemas"]["EventType"];
export type EventTypeCreate = components["schemas"]["EventTypeCreate"];
export type EventTypeUpdate = components["schemas"]["EventTypeUpdate"];
export type Slot = components["schemas"]["Slot"];
export type Booking = components["schemas"]["Booking"];
export type BookingCreate = components["schemas"]["BookingCreate"];
export type BookingWithEventType = components["schemas"]["BookingWithEventType"];

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly body?: ApiErrorBody;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const parsed: unknown = text.length > 0 ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorBody;
    throw new ApiError(
      response.status,
      errorBody.message ?? `HTTP ${response.status}`,
      errorBody,
    );
  }

  return parsed as T;
}

// =====================================================================
// Admin endpoints — owner only.
// =====================================================================

export const AdminApi = {
  listEventTypes(): Promise<EventType[]> {
    return request<EventType[]>("GET", "/admin/event-types");
  },
  getEventType(id: string): Promise<EventType> {
    return request<EventType>("GET", `/admin/event-types/${encodeURIComponent(id)}`);
  },
  createEventType(payload: EventTypeCreate): Promise<EventType> {
    return request<EventType>("POST", "/admin/event-types", payload);
  },
  updateEventType(id: string, payload: EventTypeUpdate): Promise<EventType> {
    return request<EventType>("PATCH", `/admin/event-types/${encodeURIComponent(id)}`, payload);
  },
  deleteEventType(id: string): Promise<void> {
    return request<void>("DELETE", `/admin/event-types/${encodeURIComponent(id)}`);
  },
  listBookings(from?: string, to?: string): Promise<BookingWithEventType[]> {
    const qs = buildQuery({ from, to });
    return request<BookingWithEventType[]>("GET", `/admin/bookings${qs}`);
  },
};

// =====================================================================
// Public endpoints — guest.
// =====================================================================

export const PublicApi = {
  listEventTypes(): Promise<EventType[]> {
    return request<EventType[]>("GET", "/public/event-types");
  },
  getEventType(id: string): Promise<EventType> {
    return request<EventType>("GET", `/public/event-types/${encodeURIComponent(id)}`);
  },
  listSlots(id: string, from?: string, to?: string): Promise<Slot[]> {
    const qs = buildQuery({ from, to });
    return request<Slot[]>("GET", `/public/event-types/${encodeURIComponent(id)}/slots${qs}`);
  },
  book(id: string, payload: BookingCreate): Promise<Booking> {
    return request<Booking>("POST", `/public/event-types/${encodeURIComponent(id)}/bookings`, payload);
  },
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.append(key, value);
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : "";
}
