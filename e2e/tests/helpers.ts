import { expect, type Page, type APIRequestContext } from "@playwright/test";

const BACKEND_URL = "http://localhost:8081";

/**
 * Wait for the public event-types page to be rendered. The first wait in
 * any scenario is slow because UI5 still has to bootstrap the framework,
 * so the timeout is intentionally generous.
 */
export async function gotoPublicEventTypes(page: Page): Promise<void> {
  await page.goto("/index.html");
  await expect(
    page.getByRole("heading", { name: "Available calls" }),
  ).toBeVisible({ timeout: 60_000 });
}

/**
 * Click the event type with the given name on the public list page.
 * UI5's ObjectListItem renders the title as a plain text node — clicking
 * that text bubbles up to the list item's press handler.
 */
export async function openEventType(page: Page, name: string): Promise<void> {
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByText("Pick a date", { exact: true })).toBeVisible();
}

/**
 * Pick today on the calendar (always in the 14-day window) and click the
 * first free slot button. Returns the slot's local label (e.g. "10:30").
 */
export async function pickFirstSlotOnToday(page: Page): Promise<string> {
  await page.locator(".sapUiCalItemNow").first().click();
  const firstSlot = page.locator(".callcal-slot-grid button").first();
  await expect(firstSlot).toBeVisible();
  const label = (await firstSlot.textContent()) ?? "";
  await firstSlot.click();
  return label.trim();
}

/**
 * Fill in the guest-side booking form. `notes` is optional.
 */
export async function fillBookingForm(
  page: Page,
  guestName: string,
  guestEmail: string,
  notes?: string,
): Promise<void> {
  await page.getByLabel("Name", { exact: true }).fill(guestName);
  await page.getByLabel("Email", { exact: true }).fill(guestEmail);
  if (notes !== undefined) {
    await page
      .getByLabel(/What would you like to talk about/)
      .fill(notes);
  }
}

/**
 * Read the seeded event types from the backend.
 */
export async function fetchEventTypes(
  request: APIRequestContext,
): Promise<Array<{ id: string; name: string; durationMinutes: number }>> {
  const response = await request.get(`${BACKEND_URL}/public/event-types`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Read free slots for an event type from the backend.
 */
export async function fetchSlots(
  request: APIRequestContext,
  eventTypeId: string,
): Promise<Array<{ startTime: string; endTime: string }>> {
  const response = await request.get(
    `${BACKEND_URL}/public/event-types/${eventTypeId}/slots`,
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Create a booking through the backend (used to simulate a race between
 * two guests competing for the same slot).
 */
export async function bookViaApi(
  request: APIRequestContext,
  eventTypeId: string,
  startTime: string,
  guestName: string,
  guestEmail: string,
): Promise<number> {
  const response = await request.post(
    `${BACKEND_URL}/public/event-types/${eventTypeId}/bookings`,
    { data: { startTime, guestName, guestEmail } },
  );
  return response.status();
}

/**
 * Generate a unique email per test so concurrent runs do not collide on
 * the shared in-memory backend.
 */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}
