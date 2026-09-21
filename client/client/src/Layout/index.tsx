import { Outlet, useMatches, useNavigate } from "react-router-dom";
import PageHeading from "../Components/PageHeading";
import Sidebar from "../Components/Sidebar";
import "./index.css";
import Btn from "../Components/Buttons/Button";
// import { useNotificationStream } from "../hooks/useNotificationStream";
import { useNotification } from "../hooks/useNotification";
import { ToastContainer, type ToastMessage } from "../Components/ToastNotification.tsx";
import { useEffect, useState } from "react";

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
  const restaurantId = "DEL-CH101"
  const { notifications, isConnected } = useNotification(restaurantId, "RESTAURANT");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const currentMatch = matches[matches.length - 1];

  const handle = currentMatch.handle as RouteHandle | undefined;
  const primaryHeading: string | undefined = handle?.primaryHeading;
  const secondaryHeading: string | undefined = handle?.secondaryHeading;
  const cta:CTA_Button |undefined =  handle?.CTA_Button;
  const navigate = useNavigate()
  useEffect(() => {
    if (notifications.length > 0) {
      // Snatch the latest real-time item that just appended to the top
      const latestNotification = notifications[0];

      // Convert it to a Toast payload layout map
      const newToast: ToastMessage = {
        id: crypto.randomUUID(), // Using the unique Postgres ID
        title: latestNotification.title,
        message: latestNotification.message,
        priority: "LOW"
      };

      console.log("notification updated")
      // Push it into the active floating visibility stack array
      setToasts((prev) => [...prev, newToast]);
    }
  }, [notifications]);
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  // const actionButton:string | null = currentMatch.handle?.actionButton;
  return (
    <div className="PostLoginLayouts-cntr">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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
