import React, { createContext, useContext, useState } from "react";
import "./index.css";
// Ensure this path matches your project structure, or replace with an inline SVG
import Chevron from "../../assets/Arrow/Chevron_Down.svg";

interface DropdownContextType<T> {
  options: T[];
  selectedValue: T | null;
  setSelectedValue: (value: T) => void;
  disabled: boolean;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  getLabel: (option: T) => string;
  isOptionDisabled: (option: T) => boolean;
}

interface DropdownRootProps<T> {
  children: React.ReactNode;
  options: T[];
  disabled?: boolean;
  selectedValue: T | null;
  setSelectedValue: (value: T) => void;
  getLabel?: (option: T) => string;
  isOptionDisabled?: (option: T) => boolean;
  additionalClass?: string;
}

const DropdownContext = createContext<DropdownContextType<unknown> | null>(null);

const useDropdownContext = <T,>(): DropdownContextType<T> => {
  const context = useContext(DropdownContext);

  if (!context) {
    throw new Error("Dropdown components must be used within <Dropdown />");
  }

  return context as DropdownContextType<T>;
};

const DropdownLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { disabled } = useDropdownContext();

  return (
    <span className={`dropdown-label ${disabled ? "disabled" : ""}`}>
      {children}
    </span>
  );
};

const DropdownTrigger: React.FC<{ placeholder?: string }> = ({
  placeholder = "Select an option",
}) => {
  const { selectedValue, toggle, disabled, isOpen, getLabel } = useDropdownContext();

  return (
    <div
      className={`dropdown-container ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
      onClick={() => !disabled && toggle()}
      aria-disabled={disabled}
      aria-expanded={isOpen}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span className={selectedValue === null ? "placeholder" : ""}>
        {selectedValue !== null ? getLabel(selectedValue) : placeholder}
      </span>

      <span className={`dropdown-chevron ${isOpen ? "open" : ""}`}>
        <img src={Chevron} width="16px" alt="chevron" />
      </span>
    </div>
  );
};

const DropdownOptions = <T,>() => {
  const {
    options,
    selectedValue,
    setSelectedValue,
    close,
    getLabel,
    isOpen,
    isOptionDisabled,
  } = useDropdownContext<T>();

  if (!isOpen) return null;

  return (
    <div className="dropdown-options" role="listbox">
      {options.map((option, index) => {
        const disabled = isOptionDisabled(option);
        const selected = option === selectedValue;

        return (
          <span
            key={index}
            className={`dropdown-option ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
            role="option"
            aria-selected={selected}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setSelectedValue(option);
              close();
            }}
          >
            {getLabel(option)}
          </span>
        );
      })}
    </div>
  );
};

const DropdownRoot = <T,>({
  children,
  options,
  selectedValue,
  setSelectedValue,
  disabled = false,
  getLabel = (option: T) => String(option),
  isOptionDisabled = () => false,
  additionalClass = "",
}: DropdownRootProps<T>) => {
  const [isOpen, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  const value: DropdownContextType<T> = {
    options,
    selectedValue,
    setSelectedValue,
    disabled,
    isOpen,
    toggle,
    close,
    getLabel,
    isOptionDisabled,
  };

  return (
    <DropdownContext.Provider value={value as DropdownContextType<unknown>}>
      <div className={`dropdown ${disabled ? "disabled" : ""} ${additionalClass}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const Dropdown = Object.assign(DropdownRoot, {
  Label: DropdownLabel,
  Trigger: DropdownTrigger,
  Options: DropdownOptions,
});