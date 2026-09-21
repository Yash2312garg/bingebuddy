import React from "react";
import "./Button.css";
import type { ButtonProps } from "../../Types/Buttons";

// No need to extend again if ButtonProps already extends ButtonHTMLAttributes
const Btn: React.FC<ButtonProps> = ({
  children,
  variant = "Primary",
  size = "Large",
  status = "Default",
  disabled = false,
  className = "",
  ...rest
}) => {
  const getClassNames = () => {
    return [
      "btn",
      className,
      variant.toLowerCase(),
      size.toLowerCase(),
      status.toLowerCase(),
      disabled ? "disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <button
      className={getClassNames()}
      disabled={disabled || status === "Disabled"}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Btn;
