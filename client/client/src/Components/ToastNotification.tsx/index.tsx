// components/ToastNotification.tsx
import React, { useEffect } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

/**
 * Individual Auto-Vanishing Toast Banner Card
 */
const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    // Automatically trigger the close animation/teardown after 4 seconds
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  // Map priority colors for visual distinction
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "HIGH": return { borderLeft: "5px solid #ef4444", icon: "🚨" };
      case "MEDIUM": return { borderLeft: "5px solid #f59e0b", icon: "⚠️" };
      default: return { borderLeft: "5px solid #10b981", icon: "🟢" };
    }
  };

  const config = getPriorityStyle(toast.priority);

  return (
    <div style={{
      ...styles.toastCard,
      ...{ borderLeft: config.borderLeft }
    }}>
      <div style={styles.iconContainer}>{config.icon}</div>
      <div style={styles.textContainer}>
        <strong style={styles.title}>{toast.title}</strong>
        <p style={styles.message}>{toast.message}</p>
      </div>
      <button style={styles.closeButton} onClick={() => onClose(toast.id)}>×</button>
    </div>
  );
};

/**
 * Main Container that holds the floating list of banners
 */
export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};

// Inline styles for zero external dependencies
const styles = {
  container: {
    position: "fixed" as const,
    top: "20px",
    right: "20px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    maxWidth: "350px",
    width: "100%"
  },
  toastCard: {
    background: "#ffffff",
    color: "#1f2937",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    display: "flex",
    alignItems: "flex-start",
    position: "relative" as const,
    animation: "slideIn 0.3s ease-out forwards",
    fontFamily: "system-ui, sans-serif",
  },
  iconContainer: {
    marginRight: "12px",
    fontSize: "20px",
    lineHeight: "1"
  },
  textContainer: {
    flex: 1,
    paddingRight: "20px"
  },
  title: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "4px"
  },
  message: {
    margin: 0,
    fontSize: "13px",
    color: "#4b5563",
    lineHeight: "1.4"
  },
  closeButton: {
    position: "absolute" as const,
    top: "10px",
    right: "12px",
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "0",
    lineHeight: "1"
  }
};