import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace ui.calendar
 */
export default class Component extends UIComponent {
  public static metadata = {
    manifest: "json",
    interfaces: ["sap.ui.core.IAsyncContentCreation"],
  };

  public init(): void {
    super.init();
    // Cross-page transient state for showing the post-booking confirmation.
    // Filled by the booking controller right before navigating to the
    // confirmation route, since the API contract has no GET-by-id for bookings.
    this.setModel(new JSONModel({}), "lastBooking");
    this.getRouter().initialize();
  }
}
