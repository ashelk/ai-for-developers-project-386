import { test, expect } from "@playwright/test";
import {
  fillBookingForm,
  gotoPublicEventTypes,
  openEventType,
  pickFirstSlotOnToday,
  uniqueEmail,
} from "./helpers";

test.describe("Admin view", () => {
  test("Owner sees a freshly created booking in the admin list", async ({ page }) => {
    const guestName = "Admin Audit Guest";
    const guestEmail = uniqueEmail("admin");

    // Create a booking through the UI.
    await gotoPublicEventTypes(page);
    await openEventType(page, "Deep dive");
    await pickFirstSlotOnToday(page);
    await fillBookingForm(page, guestName, guestEmail);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(
      page.getByRole("heading", { name: "Booking confirmed" }),
    ).toBeVisible();

    // Switch to the owner's bookings view.
    await page.goto("/index.html#admin/bookings");
    await expect(
      page.getByRole("heading", { name: "Upcoming bookings" }),
    ).toBeVisible({ timeout: 30_000 });

    // The freshly created booking shows up with its key fields.
    const row = page.getByRole("row").filter({ hasText: guestEmail });
    await expect(row).toBeVisible();
    await expect(row).toContainText(guestName);
    await expect(row).toContainText("Deep dive");
  });
});
