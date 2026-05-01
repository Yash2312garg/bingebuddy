import React, { createContext, useContext, useId } from "react";
import type { InputProps } from "../../Types/Input";
import "./Input.css";

type InputContextType = {
  setError?: React.Dispatch<React.SetStateAction<string | null>>;
  error?: string | null;
  disabled?: boolean;
  id: string;
};

const InputContext = createContext<InputContextType | null>(null);

const useInputContext = () => {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error(
      "Input components must be used within an <Input> provider.",
    );
  }
  return context;
};

type InputRootProps = {
  children: React.ReactNode;
  disabled?: boolean;
  setError?: React.Dispatch<React.SetStateAction<string | null>>;
  error?: string | null;
};

const InputRoot: React.FC<InputRootProps> = ({ children, disabled,error,setError }) => {
  // const [error, setError] = useState<string | null>(null);
  const id = useId();

  const value = {
    error,
    setError,
    disabled,
    id,
  };

  return (
    <InputContext.Provider value={value}>
      <div className="Input-Wrapper">{children}</div>
    </InputContext.Provider>
  );
};


const InputTopLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  children,
  ...rest
}) => {
  const { id } = useInputContext(); 
  return (
    <label className="Input-Top-Label" htmlFor={id} {...rest}>
      {children}
    </label>
  );
};

const InputBottomLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement>
> = ({ children, ...rest }) => {
  const { error } = useInputContext(); 

  return (
    <label
      className={`Input-Bottom-Label ${
        error ? "Input-Bottom-Label-Error" : ""
      }`}
      {...rest}
    >
      {error || children}
    </label>
  );
};

type InputFieldProps = InputProps & React.InputHTMLAttributes<HTMLInputElement>;

const InputField: React.FC<InputFieldProps> = ({
  inputType,
  placeholderIcon,
  ...rest
}) => {
  const { id, disabled, error, setError } = useInputContext();
  console.log(error)
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (setError) setError(null);
    if (rest.onFocus) rest.onFocus(e); 
  };

  return (
    <div className="Input-Field-Container">
      {" "}
      {placeholderIcon && (
        <span className="Input-Placeholder-Icon">{placeholderIcon}</span>
      )}
      <input
        className={`Input ${error ? "Input-Error" : ""}`}
        id={id}
        ref={rest.ref as React.Ref<HTMLInputElement>}
        name = {rest.name}
        type={inputType}
        disabled={disabled} 
        onFocus={handleFocus}
        maxLength={rest.maxLength}
        {...rest} 
      />
    </div>
  );
};


export const Input = Object.assign(InputRoot, {
  Label: InputTopLabel,
  Description: InputBottomLabel,
  Field: InputField, 
});
