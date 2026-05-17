import { test, expect } from "@playwright/test";
import {
  fillBookingForm,
  gotoPublicEventTypes,
  openEventType,
  pickFirstSlotOnToday,
  uniqueEmail,
} from "./helpers";

test.describe("Main booking scenario", () => {
  test("Guest books a Quick intro call end-to-end", async ({ page, request }) => {
    const guestName = "E2E Test Guest";
    const guestEmail = uniqueEmail("booking");
    const guestNotes = "Looking forward to the chat";

    // Step 1 — Guest lands on the public list and sees the seeded event types.
    await gotoPublicEventTypes(page);
    await expect(page.getByText("Quick intro")).toBeVisible();
    await expect(page.getByText("Deep dive")).toBeVisible();

    // Step 2 — Guest opens the "Quick intro" event type.
    await openEventType(page, "Quick intro");

    // Step 3 — Guest picks today's first free slot.
    const slotLabel = await pickFirstSlotOnToday(page);
    expect(slotLabel).toMatch(/^\d{1,2}:\d{2}/);

    // Step 4 — Guest fills the form and submits.
    await fillBookingForm(page, guestName, guestEmail, guestNotes);
    await page.getByRole("button", { name: "Confirm booking" }).click();

    // Step 5 — Guest lands on the confirmation page with their data.
    await expect(
      page.getByRole("heading", { name: "Booking confirmed" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/confirmation/);
    await expect(page.getByText(guestEmail)).toBeVisible();

    // Step 6 — The booking has been persisted on the backend.
    const adminResponse = await request.get(
      "http://localhost:8081/admin/bookings",
    );
    expect(adminResponse.ok()).toBeTruthy();
    const bookings = (await adminResponse.json()) as Array<{
      guestEmail: string;
      guestName: string;
      eventType: { name: string };
    }>;
    const justBooked = bookings.find((b) => b.guestEmail === guestEmail);
    expect(justBooked).toBeDefined();
    expect(justBooked!.guestName).toBe(guestName);
    expect(justBooked!.eventType.name).toBe("Quick intro");
  });
});
