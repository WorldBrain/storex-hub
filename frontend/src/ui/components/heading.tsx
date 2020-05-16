import React from "react";
import styled from "styled-components";
import { fontSizes } from "../styles/globals";
import { Margin } from "styled-components-spacing";

const HEADING_WIDTHS = {
  small: "500px",
  full: "100%",
};

const StyledHeading = styled.h1<{ width: keyof typeof HEADING_WIDTHS }>`
  font-size: ${fontSizes.large};
  padding-bottom: 5px;
  border-bottom: 1px solid #f1dcdc;
  width: ${(props) => HEADING_WIDTHS[props.width]};
  margin: 0;
`;

export default function Heading(props: {
  text: string;
  width?: keyof typeof HEADING_WIDTHS;
}) {
  return (
    <Margin vertical={3}>
      <StyledHeading width={props.width ?? "full"}>{props.text}</StyledHeading>
    </Margin>
  );
}
