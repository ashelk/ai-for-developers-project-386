import BaseController from "../BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import ManagedObject from "sap/ui/base/ManagedObject";
import { PublicApi, type EventType } from "../../model/Api";

interface ViewState {
  busy: boolean;
  eventTypes: EventType[];
}

/**
 * @namespace ui.calendar.controller.public
 */
export default class EventTypes extends BaseController {
  public onInit(): void {
    const initialState: ViewState = { busy: false, eventTypes: [] };
    this.getView()!.setModel(new JSONModel(initialState), "view");

    this.getRouter()
      .getRoute("publicEventTypes")!
      .attachPatternMatched(() => void this.loadEventTypes());
  }

  public formatDuration(minutes: number): string {
    if (typeof minutes !== "number") return "";
    return this.i18n("publicEventTypeDurationLabel", [minutes]);
  }

  public onSelectEventType(event: Event): void {
    const source = event.getSource() as ManagedObject;
    const context = source.getBindingContext("view");
    const eventType = context?.getObject() as EventType | undefined;
    if (!eventType) return;
    this.getRouter().navTo("publicEventTypeDetail", { eventTypeId: eventType.id });
  }

  public onGoToAdmin(): void {
    this.getRouter().navTo("adminEventTypes");
  }

  private async loadEventTypes(): Promise<void> {
    const model = this.getView()!.getModel("view") as JSONModel;
    model.setProperty("/busy", true);
    try {
      const eventTypes = await PublicApi.listEventTypes();
      model.setProperty("/eventTypes", eventTypes);
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }
}
