import React from "react";

const HoursSettings: React.FC = () => {
  return (
    <div style={{ padding: "20px 0" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          padding: "32px",
          border: "1px solid var(--muted-Grey-color)",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", color: "var(--Primary-Text-Color)" }}>
          Operating Hours & Weekly Schedule
        </h2>
        <p style={{ margin: 0, color: "var(--Secondary-Text-Color)" }}>
          Set your kitchen operating schedule for Monday through Sunday, break intervals, and temporary holiday closures.
        </p>
      </div>
    </div>
  );
};

export default HoursSettings;
