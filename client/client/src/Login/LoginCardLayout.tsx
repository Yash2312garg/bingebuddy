import React from "react";
import type {
  LoginCardLayoutProps,
  LoginCardLayoutHeadingProps,
  LoginCardLayoutSubHeadingProps,
} from "../Types/LoginCardLayout";
import "./LoginCardLayout.css";
const LoginCardLayout: React.FC<LoginCardLayoutProps> = ({ children }) => {
  return <div className="Login-Card-Layout-Container">{children}</div>;
};

export const LoginCardLayoutHeading: React.FC<LoginCardLayoutHeadingProps> = ({
  children,
}) => {
  return <h2>{children}</h2>;
};

export const LoginCardLayoutSubHeading: React.FC<
  LoginCardLayoutSubHeadingProps
> = ({ children }) => {
  return <span className="Login-Card-Layout-SubHeading">{children}</span>;
};

export const LoginCardLayoutSecondaryHeadiong: React.FC<
  LoginCardLayoutSubHeadingProps
> = ({ children }) => {
  return <h3 className="Login-Card-Layout-Secondary-Heading">{children}</h3>;
};
export default LoginCardLayout;
