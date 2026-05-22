import { Outlet, useMatches, useNavigate } from "react-router-dom";
import PageHeading from "../Components/PageHeading";
import Sidebar from "../Components/Sidebar";
import "./index.css";
import Btn from "../Components/Buttons/Button";

type RouteHandle = {
  primaryHeading?: string;
  secondaryHeading?: string;
    CTA_Button?:CTA_Button;
}
    

type CTA_Button ={
    label: string;
    to: string;
}

const PostLoginLayouts: React.FC = () => {
  const matches = useMatches();

  const currentMatch = matches[matches.length - 1];

  const handle = currentMatch.handle as RouteHandle | undefined;
  const primaryHeading: string | undefined = handle?.primaryHeading;
  const secondaryHeading: string | undefined = handle?.secondaryHeading;
  const cta:CTA_Button |undefined =  handle?.CTA_Button;
  const navigate = useNavigate()
  // const actionButton:string | null = currentMatch.handle?.actionButton;
  return (
    <div className="PostLoginLayouts-cntr">
      <Sidebar />
      <div className="PostLoginLayouts-right-cntr">
        <div className="PostLoginLayouts-header">
          <PageHeading
            primaryHeading={primaryHeading || "No Heading"}
            secondaryHeading={secondaryHeading || "No Heading"}
          />
         {cta && <Btn variant="Primary" onClick={()=>navigate(cta.to) }>{cta.label}</Btn>}
        </div >
        <Outlet />
      </div>
    </div>
  );
};
export default PostLoginLayouts;
