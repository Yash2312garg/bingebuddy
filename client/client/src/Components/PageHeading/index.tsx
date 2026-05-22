import type { PageHeadingInterface } from "../../Types/PageHeading";
import React from "react";
import "./index.css"
const PageHeading:React.FC<PageHeadingInterface> = ({primaryHeading,secondaryHeading})=>{    
    return (
    <>
        <div className="pageHeading-wrapper">
        <h2 className="pageHeading-prmry-hdng">{primaryHeading}</h2>
        <p className="pageHeading-scndry-hdng">{secondaryHeading}</p>
        </div>

    </>)
}

export default PageHeading; 