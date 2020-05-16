import React from "react";
import { Route, Switch } from "react-router";

import { Services } from "../services/types";

import ROUTES from "../routes";
import PluginOverview from "./containers/plugin-overview";
import PluginSettings from "./containers/plugin-settings";

interface Props {
  services: Services;
}
export default class Routes extends React.Component<Props> {
  render() {
    return (
      <Switch>
        <Route
          exact
          path={ROUTES.overview.path}
          render={() => {
            return <PluginOverview services={this.props.services} />;
          }}
        />
        <Route
          exact
          path={ROUTES.pluginSettings.path}
          render={() => {
            return (
              <PluginSettings
                appIdentifier="org.arweave"
                services={this.props.services}
              />
            );
          }}
        />

        {/* <Route component={NotFound} /> */}
      </Switch>
    );
  }
}
