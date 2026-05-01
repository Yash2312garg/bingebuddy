import React from "react";
import { ErrorLayout } from "./Layout";
import type { ErrorData } from "../../Types/ErrorStatusScreens";
const Error404:React.FC<ErrorData> = ({message, status, heading,isRetry}) =>{

    return (
        <div>
            <ErrorLayout.Heading>
                {heading}
            </ErrorLayout.Heading>
            <ErrorLayout.Body>
                {message}
            </ErrorLayout.Body>
            {isRetry &&<ErrorLayout.Button>
                    Retry
            </ErrorLayout.Button>}
        </div>
    )
}

export default Error404