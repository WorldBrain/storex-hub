import React from "react";
import styled from "styled-components";
import { fontSizes, fontFamilies } from "../styles/globals";

const StyledCtaBox = styled.div`
  display: flex;
  padding: 23px 29px;
  background: #ffffff;
  box-shadow: 0px 1px 6px rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  align-items: center;
`;

const CtaBoxText = styled.div`
  font-size: ${fontSizes.small};
  flex-grow: 2;
`;

const CtaBoxLink = styled.a`
  color: black;
  text-decoration: none;
  font-family: ${fontFamilies.secondary};
  font-weight: bold;
  font-size: 20px;
  line-height: 23px;
`;

export default function CtaBox(props: {
  description: string;
  linkText: string;
  externalHref: string;
}) {
  return (
    <StyledCtaBox>
      <CtaBoxText>{props.description}</CtaBoxText>
      <CtaBoxLink href={props.externalHref}>
        {props.linkText} &gt;&gt;
      </CtaBoxLink>
    </StyledCtaBox>
  );
}
