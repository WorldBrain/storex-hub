import React from "react";
import { StatefulUIComponent } from "../../types";
import PluginOverview from "./presentation";
import { logicHandlers } from "../../utils/logic";
import { PluginOverviewDependencies, PluginOverviewState } from "./types";
import { PluginOverviewLogic, PluginOverviewEvents } from "./logic";

export default class PluginOverviewContainer extends StatefulUIComponent<
  PluginOverviewDependencies,
  PluginOverviewState,
  PluginOverviewEvents
> {
  constructor(props: PluginOverviewDependencies) {
    super(props, { logic: new PluginOverviewLogic(props) });
  }

  render() {
    return (
      <PluginOverview
        services={this.props.services}
        state={this.state}
        handlers={logicHandlers(this)}
      />
    );
  }
}
