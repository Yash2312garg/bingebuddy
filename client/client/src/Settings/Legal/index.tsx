import React from "react";

const LegalSettings: React.FC = () => {
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
          Legal, Tax & Account Verification
        </h2>
        <p style={{ margin: 0, color: "var(--Secondary-Text-Color)" }}>
          View and manage your registered PAN, GSTIN, FSSAI Food License, and business account credentials.
        </p>
      </div>
    </div>
  );
};

export default LegalSettings;
