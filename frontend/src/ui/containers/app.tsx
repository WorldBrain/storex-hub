import React from "react";
import styled from "styled-components";
import Header from "../components/header";
import { Services } from "../../services/types";

const Root = styled.div``;

export default function App(props: {
  services: Pick<Services, "router">;
  children: React.ReactNode;
}) {
  return (
    <Root>
      <Header services={props.services} />
      {props.children}
    </Root>
  );
}
