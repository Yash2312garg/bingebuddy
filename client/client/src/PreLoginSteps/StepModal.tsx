import "./StepModal.css";
import React from "react";
import type { StepCountHeadingProps } from "../Types/StepModal";

export const StepCountHeading: React.FC<StepCountHeadingProps> = ({
  children,
  ...rest
}) => {
  return (
    <span className={`StepsCountHeading ${rest?.additionalClass}`}>
      {children}
    </span>
  );
};

export const ModalHeading: React.FC<StepCountHeadingProps> = ({
  children,
  ...rest
}) => {
  return (
    <h2 className={`StepsModalHeading ${rest?.additionalClass}`}>{children}</h2>
  );
};

export const ModalDescription: React.FC<StepCountHeadingProps> = ({
  children,
  ...rest
}) => {
  return (
    <p className={`Modal-Description-Span ${rest?.additionalClass}`}>
      {children}
    </p>
  );
};

const StepModal: React.FC<StepCountHeadingProps> = ({ children, ...rest }) => {
  return (
    <>
      <div
        className={`StepModal-cntr ${rest.additionalClass ? rest.additionalClass : ""}`}
      >
        {children}
      </div>
    </>
  );
};

export default StepModal;
