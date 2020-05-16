import React from "react";
import styled from "styled-components";
import { Margin } from "styled-components-spacing";
import {
  fontSizes,
  leftPaneSize,
  leftPageMargin,
  rightPageMargin,
} from "../../styles/globals";
import PluginBox from "../../components/plugin-box";
import WarningBox from "../../components/warning-box";
import Heading from "../../components/heading";
import CtaBox from "../../components/cta-box";
import AbsenceText from "../../components/absence-text";
import { PluginOverviewState, PluginOverviewHandlers } from "./types";
import { DisplayedPluginInfo } from "../../types/plugins";
import { Services } from "../../../services/types";

const StyledPlugins = styled.div`
  display: flex;
`;

const LeftPane = styled.div`
  width: ${leftPaneSize};
  padding-left: ${leftPageMargin};
  font-size: ${fontSizes.large};
`;
const LeftPaneItem = styled.div<{ active?: boolean }>`
  font-weight: ${(props) => (props.active ? "bold" : "normal")};
  margin-bottom: 50px;
`;

const MainArea = styled.div`
  margin-right: ${rightPageMargin};
`;

export default function PluginOverview(props: {
  services: Pick<Services, "router">;
  state: PluginOverviewState;
  handlers: PluginOverviewHandlers;
}) {
  const renderContent = () => (
    <>
      <WarningBox
        title="This is an early alpha version is not optimised for security."
        subtext="You must trust the plugins you install. They will be able to read all
            data you store in StorexHub."
      />
      <Heading text="Installed plugins" />
      <Margin bottom={3}>
        {renderPluginList(props.state.installedPlugins, {
          emptyText: "No installed plugins",
        })}
      </Margin>

      <Heading text="Available plugins" />
      <CtaBox
        description="Learn how to develop &amp; install your own plugins!"
        externalHref="https://worldbrain.github.io/storex-docs/#/storex-hub/"
        linkText="Read more"
      />
      <Margin vertical={3}>
        {renderPluginList(props.state.availablePlugins, {
          emptyText: "Can't find any other plugins on your disk",
        })}
      </Margin>
    </>
  );

  const renderPluginList = (
    plugins: DisplayedPluginInfo[],
    options: { emptyText: string }
  ) => {
    return (
      <>
        {!plugins.length ? (
          <AbsenceText>{options.emptyText}</AbsenceText>
        ) : null}
        {plugins.length
          ? plugins.map((plugin) => (
              <Margin vertical={5} key={plugin.identifier}>
                <PluginBox
                  services={props.services}
                  plugin={plugin}
                  onInstall={() =>
                    props.handlers.installPlugin({
                      identifier: plugin.identifier,
                    })
                  }
                  onEnable={() =>
                    props.handlers.enablePlugin({
                      identifier: plugin.identifier,
                    })
                  }
                  onDisable={() =>
                    props.handlers.disablePlugin({
                      identifier: plugin.identifier,
                    })
                  }
                />
              </Margin>
            ))
          : null}
      </>
    );
  };

  return (
    <Margin top={5}>
      <StyledPlugins>
        <LeftPane>
          {/* <LeftPaneItem active={true}>Available</LeftPaneItem> */}
          {/* <LeftPaneItem>Installed</LeftPaneItem> */}
        </LeftPane>
        <MainArea>
          {props.state.loadState === "error" && (
            <AbsenceText>
              An error occurred while loading plugin overview
              {props.state.loadError && `: ${props.state.loadError}`}
            </AbsenceText>
          )}
          {props.state.loadState === "success" && renderContent()}
        </MainArea>
      </StyledPlugins>
    </Margin>
  );
}
