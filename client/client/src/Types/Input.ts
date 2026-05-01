export interface InputProps {
  inputType?: "Text" | "Password" | "Email" | "Number" | "Search";
  label?: boolean;
  placeholderIcon?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement | null>;
  maxLenght?: number;
}
