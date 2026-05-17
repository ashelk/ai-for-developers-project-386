import BaseController from "../BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import ManagedObject from "sap/ui/base/ManagedObject";
import Calendar from "sap/ui/unified/Calendar";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import {
  PublicApi,
  type EventType,
  type Slot,
} from "../../model/Api";

interface SlotEntry {
  startTime: string;
  endTime: string;
  label: string;
}

interface FieldError {
  state: "Error" | "None";
  text: string;
}

interface ViewState {
  busy: boolean;
  eventType: Partial<EventType>;
  slots: SlotEntry[];
  slotsForDay: SlotEntry[];
  selectedDate: string | null;
  selectedSlotStart: string | null;
  minDate: Date;
  maxDate: Date;
  form: {
    guestName: string;
    guestEmail: string;
    guestNotes: string;
  };
  formErrors: {
    guestName: FieldError;
    guestEmail: FieldError;
  };
}

const NO_ERROR: FieldError = { state: "None", text: "" };

/**
 * @namespace ui.calendar.controller.public
 */
export default class EventTypeDetail extends BaseController {
  private eventTypeId: string | null = null;

  public onInit(): void {
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 14);

    const initial: ViewState = {
      busy: false,
      eventType: {},
      slots: [],
      slotsForDay: [],
      selectedDate: null,
      selectedSlotStart: null,
      minDate: now,
      maxDate: max,
      form: { guestName: "", guestEmail: "", guestNotes: "" },
      formErrors: { guestName: NO_ERROR, guestEmail: NO_ERROR },
    };
    this.getView()!.setModel(new JSONModel(initial), "view");

    this.getRouter()
      .getRoute("publicEventTypeDetail")!
      .attachPatternMatched((event: Route$PatternMatchedEvent) => {
        const args = event.getParameter("arguments") as { eventTypeId: string };
        this.eventTypeId = args.eventTypeId;
        void this.loadDetail();
      });
  }

  public formatDuration(minutes: number): string {
    if (typeof minutes !== "number") return "";
    return this.i18n("publicEventTypeDurationLabel", [minutes]);
  }

  public onNavBack(): void {
    this.navBack("publicEventTypes");
  }

  public onDateSelected(event: Event): void {
    const calendar = event.getSource() as Calendar;
    const selectedRanges = calendar.getSelectedDates();
    if (selectedRanges.length === 0) return;
    const localDate = selectedRanges[0].getStartDate() as unknown as Date | null;
    if (!localDate) return;
    const model = this.getView()!.getModel("view") as JSONModel;
    const isoDate = formatLocalDate(localDate);
    model.setProperty("/selectedDate", isoDate);
    model.setProperty("/selectedSlotStart", null);
    const slots = model.getProperty("/slots") as SlotEntry[];
    model.setProperty(
      "/slotsForDay",
      slots.filter((s) => sameLocalDay(s.startTime, localDate)),
    );
  }

  public onSelectSlot(event: Event): void {
    const source = event.getSource() as ManagedObject;
    const context = source.getBindingContext("view");
    const slot = context?.getObject() as SlotEntry | undefined;
    if (!slot) return;
    const model = this.getView()!.getModel("view") as JSONModel;
    model.setProperty("/selectedSlotStart", slot.startTime);
  }

  public async onSubmitBooking(): Promise<void> {
    if (!this.eventTypeId) return;
    const model = this.getView()!.getModel("view") as JSONModel;
    const slotStart = model.getProperty("/selectedSlotStart") as string | null;
    if (!slotStart) {
      this.toast("publicEventTypeDetailNoSlotSelected");
      return;
    }

    const form = model.getProperty("/form") as ViewState["form"];
    if (!this.validateForm(form)) return;

    model.setProperty("/busy", true);
    try {
      const booking = await PublicApi.book(this.eventTypeId, {
        startTime: slotStart,
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        guestNotes: form.guestNotes.length > 0 ? form.guestNotes : undefined,
      });
      this.toast("successBookingCreated");
      const lastBooking = this.getOwnerComponent()!.getModel("lastBooking") as JSONModel;
      lastBooking.setData({
        booking,
        eventType: model.getProperty("/eventType"),
      });
      this.getRouter().navTo("publicConfirmation", { eventTypeId: this.eventTypeId });
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }

  private validateForm(form: ViewState["form"]): boolean {
    const model = this.getView()!.getModel("view") as JSONModel;
    const errors: ViewState["formErrors"] = {
      guestName: NO_ERROR,
      guestEmail: NO_ERROR,
    };
    let valid = true;
    if (form.guestName.trim().length === 0) {
      errors.guestName = { state: "Error", text: this.i18n("errorValidation") };
      valid = false;
    }
    if (!/^.+@.+\..+$/.test(form.guestEmail.trim())) {
      errors.guestEmail = { state: "Error", text: this.i18n("errorValidation") };
      valid = false;
    }
    model.setProperty("/formErrors", errors);
    return valid;
  }

  private async loadDetail(): Promise<void> {
    if (!this.eventTypeId) return;
    const model = this.getView()!.getModel("view") as JSONModel;
    this.resetState(model);
    model.setProperty("/busy", true);
    try {
      const [eventType, slots] = await Promise.all([
        PublicApi.getEventType(this.eventTypeId),
        PublicApi.listSlots(this.eventTypeId),
      ]);
      model.setProperty("/eventType", eventType);
      const slotEntries = slots
        .map((s) => toSlotEntry(s))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      model.setProperty("/slots", slotEntries);
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }

  private resetState(model: JSONModel): void {
    model.setProperty("/eventType", {});
    model.setProperty("/slots", []);
    model.setProperty("/slotsForDay", []);
    model.setProperty("/selectedDate", null);
    model.setProperty("/selectedSlotStart", null);
    model.setProperty("/form", { guestName: "", guestEmail: "", guestNotes: "" });
    model.setProperty("/formErrors", { guestName: NO_ERROR, guestEmail: NO_ERROR });
  }
}

function toSlotEntry(slot: Slot): SlotEntry {
  const start = new Date(slot.startTime);
  const label = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { startTime: slot.startTime, endTime: slot.endTime, label };
}

function sameLocalDay(isoDateTime: string, localDate: Date): boolean {
  const d = new Date(isoDateTime);
  return (
    d.getFullYear() === localDate.getFullYear() &&
    d.getMonth() === localDate.getMonth() &&
    d.getDate() === localDate.getDate()
  );
}

function formatLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
