import React, { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface ToastProps {
  toast: ToastMessage;
  index: number;
  isHovered: boolean;
  onClose: (id: string) => void;
}

/**
 * Individual Auto-Vanishing Toast Banner Card
 */
const ToastItem: React.FC<ToastProps> = ({ toast, index, isHovered, onClose }) => {
  // Pause the removal timer if the user is actively hovering over the stack
  useEffect(() => {
    if (isHovered) return; // Pause timer

    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose, isHovered]);

  // Priority color accents (similar to Slack)
  const priorityColor = 
    toast.priority === "HIGH" ? "#ef4444" : 
    toast.priority === "MEDIUM" ? "#f59e0b" : "#3b82f6";

  // --- The Stacking Math ---
  // When hovered: Spread them out by ~85px each.
  // When stacked: Push them down by 14px and shrink them by 5% per index.
  const translateY = isHovered ? index * 85 : index * 14;
  const scale = isHovered ? 1 : 1 - index * 0.05;
  // Fade out items deeper than 3 in the stack to keep it clean
  const opacity = isHovered ? 1 : index > 2 ? 0 : 1 - index * 0.1;

  return (
    <div
      style={{
        ...styles.toast,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity: opacity,
        zIndex: 100 - index, // Newest (index 0) is always in front
        pointerEvents: opacity === 0 ? "none" : "auto",
        borderLeft: `4px solid ${priorityColor}`,
      }}
    >
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.title}>{toast.title}</span>
          <button style={styles.closeButton} onClick={() => onClose(toast.id)}>
            ×
          </button>
        </div>
        <p style={styles.message}>{toast.message}</p>
      </div>
    </div>
  );
};

/**
 * Main Container that holds the floating list of banners
 */
export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}> = ({ toasts, removeToast }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Limit rendering to the 5 most recent toasts to prevent DOM bloat
  const visibleToasts = toasts.slice(0, 5);

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {visibleToasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          isHovered={isHovered}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};

// --- Styles ---
// Using React.CSSProperties ensures TypeScript doesn't complain about standard CSS keys
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: 24,
    right: 24,
    width: 320,
    // The container needs a fixed height so the absolute items don't break layout,
    // but we use pointer-events carefully so it doesn't block underlying UI clicks
    zIndex: 9999,
  },

  toast: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "100%",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    
    // This is the magic that creates the smooth fanning effect
    transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease",
    transformOrigin: "top center", // Ensures they shrink towards the top middle
  },

  content: {
    display: "flex",
    flexDirection: "column",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "4px",
  },

  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: "1.2",
  },

  message: {
    margin: 0,
    fontSize: "13px",
    color: "#4b5563",
    lineHeight: "1.4",
    // Truncate long messages with an ellipsis
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#9ca3af",
    fontSize: "20px",
    padding: "0 0 0 8px",
    lineHeight: "1",
    marginTop: "-2px",
    transition: "color 0.2s",
  },
};