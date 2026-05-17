import ComponentContainer from "sap/ui/core/ComponentContainer";

new ComponentContainer({
  name: "ui.calendar",
  settings: { id: "calendar" },
  async: true,
}).placeAt("content");
