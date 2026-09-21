import React from "react";
import Overlays from "../Overlays";
import "./index.css";


type ConfirmActionPopupRootProps = {
  open: boolean;
  children: React.ReactNode;
};

const ConfirmActionPopupRoot: React.FC<
  ConfirmActionPopupRootProps
> = ({ open, children }) => {
  if (!open) return null;

  return (
    <>
      <Overlays />
      <div className="Confirmation-action-Popup-wrapper">
        <div className="Confirmation-action-Popup-cntr">
          {children}
        </div>
      </div>
    </>
  );
};


const PopupHeading: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <h2 className="Confirmation-action-Popup-heading">
      {children}
    </h2>
  );
};

const PopupContent: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <p className="Confirmation-action-Popup-content">
      {children}
    </p>
  );
};

const PopupActionButtonContainer: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="Confirmation-action-Popup-btn-cntr">
      {children}
    </div>
  );
};


export const ConfirmActionPopup = Object.assign(
  ConfirmActionPopupRoot,
  {
    Heading: PopupHeading,
    Content: PopupContent,
    Actions: PopupActionButtonContainer,
  }
);