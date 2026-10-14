import React from "react";

const AddressSettings: React.FC = () => {
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
          Address & Geo-Location
        </h2>
        <p style={{ margin: 0, color: "var(--Secondary-Text-Color)" }}>
          Configure your physical storefront address, delivery hub coordinates, and landmark details.
        </p>
      </div>
    </div>
  );
};

export default AddressSettings;
