import React from "react";
import styled from "styled-components";
import { colors } from "../styles/globals";
import check from "../../assets/images/check.svg";

type InputProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

const StyledCheckbox = styled.label`
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<any>`
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  margin: 0;
  margin-right: 10px;

  &:checked {
    background: url(${check}) ${colors.action} no-repeat;
    background-size: 14px 14px;
    background-position: 3px 3px;
    border: 0;
  }
`;

export default function Checkbox(
  props: Omit<InputProps, "value"> & { label: string; value: boolean }
) {
  return (
    <StyledCheckbox>
      <StyledInput
        type="checkbox"
        checked={props.value}
        onChange={() => {}}
        {...props}
      />
      {props.label}
    </StyledCheckbox>
  );
}
