import React from "react";
import styled from "styled-components";
import { fontSizes, fontFamilies } from "../styles/globals";

const StyledWarningBox = styled.div`
  font-family: ${fontFamilies.secondary};
  display: flex;
  padding: 20px;
  background-color: #f80909;
  color: white;
  border-radius: 4px;
`;
const WarningBoxIcon = styled.div`
  transform: translateY(15px);
  font-size: 80px;
  font-weight: bold;
  margin: 0 20px;

  :before {
    content: "!";
    display: block;
    height: 0;
    margin-top: -30px;
  }
`;
const WarningBoxText = styled.div`
  font-size: ${fontSizes.warningText};
  line-height: 30px;
`;

export interface WarningBoxProps {
  title: string;
  subtext: string;
}

export default function WarningBox(props: WarningBoxProps) {
  return (
    <StyledWarningBox>
      <WarningBoxIcon />
      <WarningBoxText>
        <strong>{props.title}</strong>
        <br />
        {props.subtext}
      </WarningBoxText>
    </StyledWarningBox>
  );
}
