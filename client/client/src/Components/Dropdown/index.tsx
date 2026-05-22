import { createContext, useContext, useState } from "react";
import "./index.css";

interface DropdownContextType<T> {
  options: T[];
  selectedValue: T | null;
  setSelectedValue: (value: T) => void;
  disabled: boolean;
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  getLabel: (option: T) => string;
}

interface DropdownRootProps<T> {
  children: React.ReactNode;
  options: T[];
  disabled?: boolean;
  selectedValue: T | null;
  setSelectedValue: (value: T) => void;
  getLabel?: (option: T) => string;
  additionalClass?: string
}

const DropdownContext = createContext<DropdownContextType<unknown> | null>(
  null,
);

const useDropdownContext = <T,>(): DropdownContextType<T> => {
  const context = useContext(DropdownContext);
  if (!context)
    throw new Error("Dropdown components must be used within <Dropdown />");
  return context as DropdownContextType<T>;
};

const DropdownLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
  const { selectedValue, toggle, disabled, isOpen, getLabel } =
    useDropdownContext();
  console.log(isOpen);
  return (
    <div
      className={`
        dropdown-container
        ${disabled ? "disabled" : ""}
        ${isOpen ? "open" : ""}
      `}
      onClick={() => !disabled && toggle()}
      aria-disabled={disabled}
      aria-expanded={isOpen}
      role="button"
    >
      <span className={selectedValue === null ? "placeholder" : ""}>
        {selectedValue !== null ? getLabel(selectedValue) : placeholder}
      </span>
      <span className={`dropdown-chevron ${isOpen ? "open" : ""}`}>▾</span>
    </div>
  );
};

const DropdownOptions = <T,>() => {
  const { options, setSelectedValue, close, getLabel, isOpen, selectedValue } =
    useDropdownContext<T>();
  console.log(close);
  return (
    <>
      {isOpen && (
        <div className="dropdown-options" role="listbox">
          {options.map((option, index) => {
            const label = getLabel(option);
            const isSelected = option === selectedValue;

            return (
              <span
                key={index}
                className={`dropdown-option ${isSelected ? "selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedValue(option);
                  close();
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
};

const DropdownRoot = <T,>({
  children,
  options,
  selectedValue,
  setSelectedValue,
  disabled = false,
  getLabel = (option: T) => String(option),
  additionalClass = ""
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
  };

  return (
    <DropdownContext.Provider value={value as DropdownContextType<unknown>}>
      <div className={`dropdown ${disabled ? "disabled" : ""} ${additionalClass ? additionalClass:""}`}>{children}</div>
    </DropdownContext.Provider>
  );
};

export const Dropdown = Object.assign(DropdownRoot, {
  Label: DropdownLabel,
  Trigger: DropdownTrigger,
  Options: DropdownOptions,
});
