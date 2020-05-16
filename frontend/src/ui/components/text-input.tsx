import React from "react";
import styled from "styled-components";
import { fontSizes } from "../styles/globals";

type InputProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

const StyledInput = styled.input<any>`
  width: 420px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  padding: 16px 20px;
  font-size: ${fontSizes.small};
  color: #36362f;

  ::placeholder {
    color: rgba(54, 54, 47, 0.5);
  }
`;

export default function TextInput(props: InputProps) {
  return <StyledInput type="text" {...props} />;
}
