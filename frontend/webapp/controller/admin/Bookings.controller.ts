import BaseController from "../BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { AdminApi, type BookingWithEventType } from "../../model/Api";

interface ViewState {
  busy: boolean;
  bookings: BookingWithEventType[];
}

/**
 * @namespace ui.calendar.controller.admin
 */
export default class Bookings extends BaseController {
  public onInit(): void {
    const initial: ViewState = { busy: false, bookings: [] };
    this.getView()!.setModel(new JSONModel(initial), "view");
    this.getRouter()
      .getRoute("adminBookings")!
      .attachPatternMatched(() => void this.loadBookings());
  }

  public onNavHome(): void {
    this.getRouter().navTo("publicEventTypes", {}, undefined, true);
  }

  public onNavToEventTypes(): void {
    this.getRouter().navTo("adminEventTypes");
  }

  public formatTime(isoDateTime: string): string {
    if (!isoDateTime) return "";
    const d = new Date(isoDateTime);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private async loadBookings(): Promise<void> {
    const model = this.getView()!.getModel("view") as JSONModel;
    model.setProperty("/busy", true);
    try {
      const bookings = await AdminApi.listBookings();
      model.setProperty("/bookings", bookings);
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }
}
