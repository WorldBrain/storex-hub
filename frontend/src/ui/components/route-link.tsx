import React from "react";
import { Link } from "react-router-dom";
import { Services } from "../../services/types";
import { RouteLinkOptions } from "../../routes";

export default function RouteLink(
  props: {
    children: React.ReactNode;
    services: Pick<Services, "router">;
  } & RouteLinkOptions
) {
  return (
    <Link
      to={props.services.router.getUrl(props.route, props.params)}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {props.children}
    </Link>
  );
}
