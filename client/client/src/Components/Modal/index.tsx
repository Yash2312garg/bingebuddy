import React, { useEffect } from "react";
import CrossIcon from "../../assets/delete.svg"; // Replace with your close/X icon path if needed
import "./index.css";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = "md",
  closeOnOverlayClick = true,
  children,
  footer,
}) => {
  // Prevent background scrolling when modal is open & handle Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div className="Modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={`Modal-container size-${size}`}>
        {/* Modal Header */}
        <div className="Modal-header">
          {title && <h3 className="Modal-title">{title}</h3>}
          <button className="Modal-close-btn" onClick={onClose} aria-label="Close modal">
            <img src={CrossIcon} alt="Close" width="16" height="16" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="Modal-body">{children}</div>

        {/* Optional Modal Footer */}
        {footer && <div className="Modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;