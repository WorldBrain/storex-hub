import React from "react";
import styled from "styled-components";
import { leftPageMargin } from "../styles/globals";

const StyledSubheader = styled.div`
  height: 75px;
  box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.25);
  padding-left: ${leftPageMargin};
  display: flex;
  align-items: center;
  margin-top: 80px;
`;

export default function Subheader(props: { children: React.ReactNode }) {
  return <StyledSubheader>{props.children}</StyledSubheader>;
}
