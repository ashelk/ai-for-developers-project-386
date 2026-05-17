import BaseController from "../BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import ManagedObject from "sap/ui/base/ManagedObject";
import {
  AdminApi,
  type EventType,
  type EventTypeCreate,
} from "../../model/Api";

interface DialogState {
  open: boolean;
  busy: boolean;
  mode: "create" | "edit";
  title: string;
  editingId: string | null;
  form: {
    name: string;
    description: string;
    durationMinutes: number;
  };
  errors: {
    name: { state: "Error" | "None"; text: string };
  };
}

interface ViewState {
  busy: boolean;
  eventTypes: EventType[];
  dialog: DialogState;
}

const EMPTY_FORM: DialogState["form"] = {
  name: "",
  description: "",
  durationMinutes: 30,
};

const NO_ERROR = { state: "None" as const, text: "" };

/**
 * @namespace ui.calendar.controller.admin
 */
export default class EventTypes extends BaseController {
  private dialog: Dialog | null = null;

  public onInit(): void {
    const initial: ViewState = {
      busy: false,
      eventTypes: [],
      dialog: {
        open: false,
        busy: false,
        mode: "create",
        title: "",
        editingId: null,
        form: { ...EMPTY_FORM },
        errors: { name: NO_ERROR },
      },
    };
    this.getView()!.setModel(new JSONModel(initial), "view");

    this.getRouter()
      .getRoute("adminEventTypes")!
      .attachPatternMatched(() => void this.loadEventTypes());
  }

  public onNavHome(): void {
    this.getRouter().navTo("publicEventTypes", {}, undefined, true);
  }

  public onNavToBookings(): void {
    this.getRouter().navTo("adminBookings");
  }

  public async onCreate(): Promise<void> {
    const model = this.getViewModel();
    model.setProperty("/dialog/mode", "create");
    model.setProperty("/dialog/title", this.i18n("adminEventTypesDialogCreateTitle"));
    model.setProperty("/dialog/editingId", null);
    model.setProperty("/dialog/form", { ...EMPTY_FORM });
    model.setProperty("/dialog/errors", { name: NO_ERROR });
    (await this.getDialog()).open();
  }

  public async onEdit(event: Event): Promise<void> {
    const eventType = this.contextOf<EventType>(event);
    if (!eventType) return;
    const model = this.getViewModel();
    model.setProperty("/dialog/mode", "edit");
    model.setProperty("/dialog/title", this.i18n("adminEventTypesDialogEditTitle"));
    model.setProperty("/dialog/editingId", eventType.id);
    model.setProperty("/dialog/form", {
      name: eventType.name,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
    });
    model.setProperty("/dialog/errors", { name: NO_ERROR });
    (await this.getDialog()).open();
  }

  public onDialogCancel(): void {
    this.dialog?.close();
  }

  public async onDialogSave(): Promise<void> {
    const model = this.getViewModel();
    const dialogState = model.getProperty("/dialog") as DialogState;
    const form = dialogState.form;

    if (form.name.trim().length === 0) {
      model.setProperty("/dialog/errors/name", {
        state: "Error",
        text: this.i18n("errorValidation"),
      });
      return;
    }

    model.setProperty("/dialog/busy", true);
    try {
      const payload: EventTypeCreate = {
        name: form.name.trim(),
        description: form.description.trim(),
        durationMinutes: form.durationMinutes,
      };
      if (dialogState.mode === "create") {
        await AdminApi.createEventType(payload);
        this.toast("successEventTypeCreated");
      } else if (dialogState.editingId) {
        await AdminApi.updateEventType(dialogState.editingId, payload);
        this.toast("successEventTypeUpdated");
      }
      this.dialog?.close();
      await this.loadEventTypes();
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/dialog/busy", false);
    }
  }

  public onDelete(event: Event): void {
    const eventType = this.contextOf<EventType>(event);
    if (!eventType) return;
    MessageBox.confirm(
      this.i18n("adminEventTypesDeleteConfirmMessage", [eventType.name]),
      {
        title: this.i18n("adminEventTypesDeleteConfirmTitle"),
        onClose: (action: string | null) => {
          if (action === MessageBox.Action.OK) {
            void this.deleteEventType(eventType.id);
          }
        },
      },
    );
  }

  private async deleteEventType(id: string): Promise<void> {
    const model = this.getViewModel();
    model.setProperty("/busy", true);
    try {
      await AdminApi.deleteEventType(id);
      this.toast("successEventTypeDeleted");
      await this.loadEventTypes();
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }

  private async loadEventTypes(): Promise<void> {
    const model = this.getViewModel();
    model.setProperty("/busy", true);
    try {
      const eventTypes = await AdminApi.listEventTypes();
      model.setProperty("/eventTypes", eventTypes);
    } catch (error) {
      this.handleApiError(error);
    } finally {
      model.setProperty("/busy", false);
    }
  }

  private async getDialog(): Promise<Dialog> {
    if (!this.dialog) {
      this.dialog = (await Fragment.load({
        id: this.getView()!.getId(),
        name: "ui.calendar.view.admin.EventTypeDialog",
        controller: this,
      })) as Dialog;
      this.getView()!.addDependent(this.dialog);
    }
    return this.dialog;
  }

  private getViewModel(): JSONModel {
    return this.getView()!.getModel("view") as JSONModel;
  }

  private contextOf<T>(event: Event): T | undefined {
    const source = event.getSource() as ManagedObject;
    const ctx = source.getBindingContext("view");
    return ctx?.getObject() as T | undefined;
  }
}
