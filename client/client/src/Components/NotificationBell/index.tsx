// components/NotificationBell.tsx
import React from "react";
import { useNotification } from "../../hooks/useNotification";

const NotificationBell = ({ restaurantId }: { restaurantId: string }) => {
    // Invoke your pipeline hook
    const { notifications, isConnected } = useNotification(restaurantId, "RESTAURANT");

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h2>
                Restaurant Live Hub Dashboard 
                <span style={{ fontSize: "14px", marginLeft: "10px", color: isConnected ? "green" : "red" }}>
                    {isConnected ? "● Live" : "○ Disconnected"}
                </span>
            </h2>

            {/* Bell Badge Alert Counter */}
            <div style={{ fontSize: "24px", position: "relative", display: "inline-block" }}>
                🔔 {notifications.length > 0 && (
                    <span style={{
                        position: "absolute", top: "-5px", right: "-5px",
                        background: "red", color: "white", borderRadius: "50%",
                        padding: "2px 6px", fontSize: "12px"
                    }}>{notifications.length}</span>
                )}
            </div>

            {/* Live Notification Feed Cards */}
            <div style={{ marginTop: "20px" }}>
                {notifications.length === 0 ? (
                    <p style={{ color: "#777" }}>No new real-time actions logged.</p>
                ) : (
                    notifications.map((notif) => (
                        <div key={notif.id} style={{
                            border: "1px solid #ddd", borderRadius: "6px",
                            padding: "12px", marginBottom: "10px",
                            background: notif.priority === "HIGH" ? "#fff5f5" : "#fff"
                        }}>
                            <h4>{notif.title}</h4>
                            <p>{notif.message}</p>
                            <small style={{ color: "#999" }}>{new Date(notif.created_at).toLocaleTimeString()}</small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationBell;