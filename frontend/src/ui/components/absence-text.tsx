import React from "react";
import styled from "styled-components";
import { fontSizes } from "../styles/globals";

const StyledAbsenceText = styled.div`
  font-weight: bold;
  font-size: ${fontSizes.small};
  line-height: 30px;

  color: rgba(58, 47, 69, 0.65);
`;

export default function AbsenceText(props: { children: React.ReactNode }) {
  return <StyledAbsenceText>{props.children}</StyledAbsenceText>;
}
