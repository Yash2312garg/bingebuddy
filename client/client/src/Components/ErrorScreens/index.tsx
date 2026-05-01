import React from "react";
import type { ErrorStatusScreensProps } from "../../Types/ErrorStatusScreens";
import Error404 from "./404";
const ErrorScreen: React.FC<ErrorStatusScreensProps> = ({
  error_status,
  data,
}) => {
  function getErrorScreens() {
    switch (error_status) {
      case 404:
        return <Error404 {...data} />;
      default:
        break;
    }
  }

  return <>{getErrorScreens()}</>;
};

export default ErrorScreen;
