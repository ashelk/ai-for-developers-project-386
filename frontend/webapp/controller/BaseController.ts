import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";
import History from "sap/ui/core/routing/History";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Model from "sap/ui/model/Model";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import { ApiError } from "../model/Api";

/**
 * @namespace ui.calendar.controller
 */
export default class BaseController extends Controller {
  protected getRouter(): Router {
    return UIComponent.getRouterFor(this);
  }

  protected getResourceBundle(): ResourceBundle {
    const i18n = this.getOwnerComponent()!.getModel("i18n") as ResourceModel;
    return i18n.getResourceBundle() as ResourceBundle;
  }

  protected i18n(key: string, args?: (string | number)[]): string {
    return this.getResourceBundle().getText(key, args?.map(String)) ?? key;
  }

  protected getModelTyped<T extends Model>(name?: string): T {
    return this.getView()!.getModel(name) as T;
  }

  protected navBack(fallbackRoute = "publicEventTypes"): void {
    const previousHash = History.getInstance().getPreviousHash();
    if (previousHash !== undefined) {
      window.history.go(-1);
    } else {
      this.getRouter().navTo(fallbackRoute, {}, undefined, true);
    }
  }

  /**
   * Standard error handler for failed API calls. Maps known error codes
   * to specific user-facing messages from the resource bundle and falls
   * back to a generic message otherwise.
   */
  protected handleApiError(error: unknown): void {
    if (error instanceof ApiError) {
      const messageKey = (() => {
        if (error.code === "slot_conflict") return "errorSlotConflict";
        if (error.code === "slot_out_of_window") return "errorSlotOutOfWindow";
        if (error.code === "validation_error") return "errorValidation";
        if (error.status === 404) return "errorNotFound";
        return "errorGeneric";
      })();
      MessageBox.error(this.i18n(messageKey));
      return;
    }
    MessageBox.error(this.i18n("errorGeneric"));
    // eslint-disable-next-line no-console
    console.error(error);
  }

  protected toast(messageKey: string): void {
    MessageToast.show(this.i18n(messageKey));
  }
}
