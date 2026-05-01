import React from "react";
import type {
    PropsWithChildren,
  ReactNode,
  HTMLAttributes,
  ButtonHTMLAttributes,
  ImgHTMLAttributes,
} from "react"



export interface ErrorHeadingProps
  extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

const ErrorHeading: React.FC<ErrorHeadingProps> = ({
  children,
  ...rest
}) => {
  return <h3 {...rest}>{children}</h3>;
};


export interface ErrorBodyProps {
  children?: ReactNode;
  defaultBody?: string;
  isIcon?: boolean;
  iconSource?: string;
  iconProps?: ImgHTMLAttributes<HTMLImageElement>;
}

const ErrorBody: React.FC<ErrorBodyProps> = ({
  children,
  defaultBody = "Something went wrong",
  isIcon = false,
  iconSource,
  iconProps,
}) => {
  return (
    <div>
      {isIcon && iconSource && (
        <img
          src={iconSource}
          alt="error-icon"
          {...iconProps}
        />
      )}

      <p>{children ?? defaultBody}</p>
    </div>
  );
};


export interface ErrorButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isButton?: boolean;

  /** Button label */
  children?: ReactNode;
}

const ErrorButton: React.FC<ErrorButtonProps> = ({
  isButton = false,
  children = "Retry",
  ...rest
}) => {
  if (!isButton) return null;

  return <button {...rest}>{children}</button>;
};



export interface ErrorLayoutRootProps
  extends PropsWithChildren,
    HTMLAttributes<HTMLDivElement> {}

const ErrorLayoutRoot: React.FC<ErrorLayoutRootProps> = ({
  children,
  ...rest
}) => {
  return (
    <div
      {...rest}
      role="alert"
      aria-live="assertive"
    >
      {children}
    </div>
  );
};



interface ErrorLayoutComponent
  extends React.FC<ErrorLayoutRootProps> {
  Heading: React.FC<ErrorHeadingProps>;
  Body: React.FC<ErrorBodyProps>;
  Button: React.FC<ErrorButtonProps>;
}



export const ErrorLayout: ErrorLayoutComponent = Object.assign(
  ErrorLayoutRoot,
  {
    Heading: ErrorHeading,
    Body: ErrorBody,
    Button: ErrorButton,
  }
);
