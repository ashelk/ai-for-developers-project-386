import BaseController from "../BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace ui.calendar.controller.public
 */
export default class Confirmation extends BaseController {
  public onInit(): void {
    this.getRouter()
      .getRoute("publicConfirmation")!
      .attachPatternMatched(() => this.checkData());
  }

  public onBackHome(): void {
    this.getRouter().navTo("publicEventTypes", {}, undefined, true);
  }

  public formatConfirmationMessage(template: string, email: string): string {
    if (!email) return "";
    return this.i18n("publicConfirmationMessage", [email]);
  }

  public formatBookingTime(isoDateTime: string): string {
    if (!isoDateTime) return "";
    const d = new Date(isoDateTime);
    return d.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * If the user arrives here without a booking in memory (e.g. via a manual
   * URL refresh), redirect back to the event-types page rather than show a
   * blank confirmation.
   */
  private checkData(): void {
    const model = this.getOwnerComponent()!.getModel("lastBooking") as JSONModel;
    const data = model.getData() as { booking?: { id?: string } } | undefined;
    if (!data?.booking?.id) {
      this.getRouter().navTo("publicEventTypes", {}, undefined, true);
    }
  }
}
