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
      variant.toLowerCase(),
      size.toLowerCase(),
      status.toLowerCase(),
      disabled ? "disabled" : "",
      className,
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
