import React from "react";
import styled from "styled-components";
import logo from "./storex-logo.png";
import {
  fontSizes,
  headerHeight,
  leftPageMargin,
  leftPaneSize,
  colors,
} from "../styles/globals";
import ROUTES, { RouteLinkOptions } from "../../routes";
import RouteLink from "./route-link";
import { Services } from "../../services/types";

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  height: ${headerHeight};
  background: #ffffff;
  box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.25);
`;
const HeaderLeft = styled.div`
  display: flex;
  width: ${leftPaneSize};
  height: ${headerHeight};
  align-items: center;
  justify-content: center;
  padding-left: ${leftPageMargin};

  img {
    width: auto;
    height: 30px;
  }

  a {
    color: black;
    font-size: ${fontSizes.large};
    font-weight: bold;
    text-decoration: none;
    display: flex;
  }
`;
const HeaderMenu = styled.div`
  display: flex;
  align-items: center;
  font-size: ${fontSizes.small};

  a {
    color: ${colors.standardFont};
    font-size: ${fontSizes.small};
    font-weight: bold;
    text-decoration: none;

    &: hover {
      color: ${colors.hoverFont};
    }
  }

  }
`;
const HeaderMenuItem = styled.div<{ active?: boolean }>`
  margin-right: 50px;
  font-weight: ${(props) => (props.active ? "bold" : "normal")};
`;

interface HeaderProps {
  services: Pick<Services, "router">;
  backLink?: RouteLinkOptions;
}

export default class Header extends React.Component<HeaderProps> {
  constructor(props: HeaderProps) {
    super(props);

    props.services.router.events.on("change", () => {
      this.forceUpdate();
    });
  }

  render() {
    const { services } = this.props;
    const route = services.router.matchCurrentUrl();
    const routeInfo = ROUTES[route.route];
    const backLink = routeInfo.backLink?.();

    return (
      <StyledHeader>
        <HeaderLeft>
          {!backLink && (
            <RouteLink services={services} route="overview">
              <img src={logo} alt="Storex Logo" />
            </RouteLink>
          )}
          {backLink && (
            <RouteLink services={services} {...backLink}>
              &lt; Go Back
            </RouteLink>
          )}
        </HeaderLeft>
        <HeaderMenu>
          <HeaderMenuItem active={true}><a target="_blank" href="https://wrldbra.in/storex_tutorials">Tutorials</a></HeaderMenuItem>
          {/* <HeaderMenuItem>Settings</HeaderMenuItem> */}
        </HeaderMenu>
      </StyledHeader>
    );
  }
}
