import { useEffect, useState } from "react";

export interface Notification{
   id: string; 
    recipient_id: string; 
    recipient_type: "USER" | "RESTAURANT" | "ADMIN"; 
    event_type: "SMS" | "EMAIL" | "IN_APP"; 
    title: string; 
    message: string; 
    action_url: string | null; 
    is_read: boolean; 
    priority: "HIGH" | "MEDIUM" | "LOW";
    created_at: string;
}

export function useNotification(recipientId: string, recipientType: string){
    const [notifications,setNotifications] = useState<Notification[]>([])
    const [isConnected,setIsConnected]  = useState(false);

    useEffect(()=>{
        if(!recipientId || !recipientType) return;

         const url:string = `http://localhost:8000/api/v1/notifications/stream?recipientId=${recipientId}&recipientType=${recipientType}`;
         const eventSource = new EventSource(url, { withCredentials: true });
        eventSource.onopen = () => {
            console.log(" Real-time notification stream established.");
            setIsConnected(true);
        };
        eventSource.onmessage = (event) => {
            try {
                const parsedData = JSON.parse(event.data);

                // Ignore the initial server connection handshake ping
                if (parsedData.status === "connected") return;

                console.log("🔥 New live notification received:", parsedData);
                
                // Prepend the new notification to the top of the feed array
                setNotifications((prev) => [parsedData as Notification, ...prev]);
            } catch (err) {
                console.error("Failed to parse incoming stream data:", err);
            }
        };
        eventSource.onerror = (error) => {
            console.error("SSE Connection dropped. Browser is auto-retrying...", error);
            setIsConnected(false);
        };
        return () => {
            console.log("🖲️ Closing SSE connection pipeline.");
            eventSource.close();
        };
    },[recipientId,recipientType])
    return { notifications, isConnected, setNotifications };
}