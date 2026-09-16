import React from "react";
import "./index.css";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  name,
  value,
  id,
  className = "",
}) => {
  const checkboxId = id || `checkbox-${name || "input"}`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <label
      htmlFor={checkboxId}
      className={`Checkbox-wrapper ${className}`}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        name={name}
        value={value}
        className="Checkbox-input"
      />

      <span className="Checkbox-box">
        {checked && <span className="Checkbox-check">✓</span>}
      </span>

      {label && <span className="Checkbox-label">{label}</span>}
    </label>
  );
};

export default Checkbox;