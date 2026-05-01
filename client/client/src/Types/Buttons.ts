export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name?: string;
  id?: string;
  variant?: "Primary" | "Secondary" | "Tertiary";
  size?: "Small" | "Medium" | "Large";
  status?: "Default" | "Disabled";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

// interface ButtonDataPRops {
//     name?: string;
//     id?:string;
//     Label?:String
// }
