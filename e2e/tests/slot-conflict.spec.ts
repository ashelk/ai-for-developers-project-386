import { test, expect } from "@playwright/test";
import {
  bookViaApi,
  fetchEventTypes,
  fetchSlots,
  fillBookingForm,
  gotoPublicEventTypes,
  openEventType,
  pickFirstSlotOnToday,
  uniqueEmail,
} from "./helpers";

test.describe("Slot conflict handling", () => {
  test("UI shows a clear error when the slot is taken behind the user's back", async ({
    page,
    request,
  }) => {
    const guestName = "Unlucky Guest";
    const guestEmail = uniqueEmail("conflict");

    await gotoPublicEventTypes(page);
    await openEventType(page, "Quick intro");

    // Identify the slot the UI will offer first (today, first free).
    const eventTypes = await fetchEventTypes(request);
    const quickIntro = eventTypes.find((e) => e.name === "Quick intro");
    expect(quickIntro).toBeDefined();
    const slots = await fetchSlots(request, quickIntro!.id);
    expect(slots.length).toBeGreaterThan(0);
    const targetStart = slots[0].startTime;

    // Guest selects that slot in the UI and starts filling the form.
    await pickFirstSlotOnToday(page);
    await fillBookingForm(page, guestName, guestEmail);

    // Meanwhile, somebody else grabs the same slot via the API.
    const stolenStatus = await bookViaApi(
      request,
      quickIntro!.id,
      targetStart,
      "Faster Guest",
      uniqueEmail("steal"),
    );
    expect(stolenStatus).toBe(201);

    // The guest hits Confirm — backend returns 409 slot_conflict,
    // and the UI must surface the user-facing message.
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page.getByText("That slot was just booked")).toBeVisible({
      timeout: 15_000,
    });

    // The user is still on the booking page (not on the confirmation page),
    // so they can pick a different slot and retry.
    await expect(
      page.getByRole("heading", { name: "Booking confirmed" }),
    ).toBeHidden();
  });
});
