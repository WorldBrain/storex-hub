import React from "react";
import styled from "styled-components";
import { colors, fontSizes } from "../styles/globals";

const Button = styled.button`
  /* Reset browser button styles */

  border: none;
  margin: 0;
  padding: 0;
  width: auto;
  overflow: visible;

  background: transparent;

  /* inherit font & color from ancestor */
  color: inherit;
  font: inherit;

  /* Normalize \`line-height\`. Cannot be changed from \`normal\` in Firefox 4+. */
  line-height: normal;

  /* Corrects font smoothing for webkit */
  -webkit-font-smoothing: inherit;
  -moz-osx-font-smoothing: inherit;

  /* Corrects inability to style clickable \`input\` types in iOS */
  -webkit-appearance: none;

  :focus {
    outline: unset;
  }
`;

const StyledPrimaryAction = styled(Button)<{ disabled?: boolean }>`
  padding: 10px 20px;
  background: ${(props) => (!props.disabled ? colors.action : colors.disabled)};
  border-radius: 5px;
  cursor: ${(props) => (!props.disabled ? "pointer" : "normal")};
  display: inline-block;
  white-space: nowrap;
`;
const StyledPrimaryActionLinkText = styled.span`
  font-size: ${fontSizes.small};
  color: #2f2f2f;
`;
export const PrimaryAction = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <StyledPrimaryAction
    autoFocus
    tabIndex={0}
    onClick={disabled === true ? undefined : onClick}
    disabled={disabled}
    onKeyPress={(e) => (e.key === "Enter" ? onClick() : false)}
  >
    <StyledPrimaryActionLinkText>{label}</StyledPrimaryActionLinkText>
  </StyledPrimaryAction>
);
