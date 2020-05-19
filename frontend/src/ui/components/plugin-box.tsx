import React from "react";
import styled from "styled-components";
import { fontSizes } from "../styles/globals";
import RouteLink from "./route-link";
import { Services } from "../../services/types";
import { DisplayedPluginInfo } from "../types/plugins";
import { stat } from "fs";
import LoadingIndicator from "./LoadingIndicator";

// importing images

// TODO: make images dependent on state

import checkImg from "../../assets/images/check.svg";
import docsImg from "../../assets/images/book-open.svg";

//
const IMAGES_BY_STATUS: {
  [Status in DisplayedPluginInfo["status"]]: string;
} = {
  available: checkImg,
  installing: "",
  "could-not-install": "",
  "installed-but-errored": "",
  "successfully-installed": "",
  enabled: "",
  enabling: "",
  "could-not-enable": "",
  "enabled-but-errored": "",
  "successfully-enabled": "",
  disabled: "",
  disabling: "",
  "could-not-disable": "",
  "disable-pending": "",
};

const StyledPluginBox = styled.div`
  display: flex;
  align-items: center;
`;
const logoRadius = "30px";
const PluginLogo = styled.div`
  width: calc(${logoRadius} * 2);
  height: calc(${logoRadius} * 2);
  min-width: calc(${logoRadius} * 2);
  min-height: calc(${logoRadius} * 2);
  border-radius: ${logoRadius};
  background: #ffffff;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.25);
`;
const PluginBody = styled.div`
  margin-left: 32px;
  display: flex;
  flex-direction: column;
`;
const PluginTitle = styled.div`
  color: black;
  font-size: ${fontSizes.small};
  font-weight: bold;
`;
const PluginDescription = styled.div`
  font-size: ${fontSizes.smaller};
  line-height: 27px;
  color: rgba(58, 47, 69, 0.62);
`;
const PluginActions = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  margin-left: 50px;
  flex-grow: 2;
`;
const PluginActionsInner = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
`;
const PluginAction = styled.div<{ status: DisplayedPluginInfo["status"] }>`
  background-image: url(${(props) => IMAGES_BY_STATUS[props.status]});
  background-size: 20px;
  background-repeat: no-repeat;
  background-position: center;
  width: 20px;
  height: 20px;
  margin-left: 10px;
  cursor: pointer;
`;
const PluginActionLink = styled.a`
  width: 20px;
  height: 20px;
  margin-left: 10px;
  background-image: url(${docsImg});
  background-size: 20px;
  background-repeat: no-repeat;
  background-position: center;
`;

export interface PluginBoxProps {
  services: Pick<Services, "router">;
  plugin: DisplayedPluginInfo;
  test?: number;
  onInstall?(): void;
  onEnable?(): void;
  onDisable?(): void;
}

export default function PluginBox(props: PluginBoxProps) {
  const { plugin } = props;
  const { status } = plugin;

  return (
    <StyledPluginBox>
      <PluginLogo></PluginLogo>
      <PluginBody>
        <PluginTitle>
          <RouteLink
            services={props.services}
            route="pluginSettings"
            params={{ identifier: plugin.identifier }}
          >
            {plugin.name}
          </RouteLink>
        </PluginTitle>
        <PluginDescription>{plugin.description}</PluginDescription>
      </PluginBody>
      <PluginActions>
        <PluginActionsInner>
          {/* Installing */}
          {status === "available" && (
            <PluginAction
              title={`Install`}
              status={status}
              onClick={props.onInstall}
            ></PluginAction>
          )}
          {status === "installing" && <LoadingIndicator />}
          {status === "installed-but-errored" && (
            <PluginAction
              title={`Installed, but there was an error starting it`}
              status={status}
            ></PluginAction>
          )}
          {status === "could-not-install" && (
            <PluginAction
              title={`Something went wrong installing the plugin`}
              status={status}
            ></PluginAction>
          )}
          {status === "successfully-installed" && (
            <PluginAction
              title={`Successfuly installed`}
              status={status}
            ></PluginAction>
          )}

          {/* Enabling */}
          {status === "disabled" && (
            <PluginAction
              title={`Enable`}
              status={status}
              onClick={props.onEnable}
            ></PluginAction>
          )}
          {status === "successfully-enabled" && (
            <PluginAction
              title={`Successfuly enabled`}
              status={status}
            ></PluginAction>
          )}

          {/* Disabling */}
          {status === "enabled" && (
            <PluginAction
              title={`Disable`}
              status={status}
              onClick={props.onDisable}
            ></PluginAction>
          )}
          {status === "disabling" && (
            <PluginAction title={`Disabling...`} status={status}></PluginAction>
          )}
          {status === "could-not-disable" && (
            <PluginAction
              title={`Something went wrong disabling the plugin`}
              status={status}
            ></PluginAction>
          )}
          {status === "disable-pending" && (
            <PluginAction
              title={`Restart Storex Hub to disable plugin`}
              status={status}
            ></PluginAction>
          )}

          {/* State-independent */}
          {plugin.siteUrl && (
            <PluginActionLink
              href={plugin.siteUrl}
              title="Read plugin documentation"
              target="_blank"
            />
          )}
        </PluginActionsInner>
      </PluginActions>
    </StyledPluginBox>
  );
}
