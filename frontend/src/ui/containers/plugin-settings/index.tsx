import React from "react";
import { StatefulUIComponent } from "../../types";
import { PluginSettingsState, PluginSettingsDependencies } from "./types";
import { PluginSettingEvents, PluginSettingsLogic } from "./logic";
import PluginSettings from "./presentation";
import { logicHandlers } from "../../utils/logic";

export default class PluginSettingsContainer extends StatefulUIComponent<
  PluginSettingsDependencies,
  PluginSettingsState,
  PluginSettingEvents
> {
  constructor(props: PluginSettingsDependencies) {
    super(props, { logic: new PluginSettingsLogic(props) });
  }

  render() {
    return <PluginSettings state={this.state} handlers={logicHandlers(this)} />;
  }
}
