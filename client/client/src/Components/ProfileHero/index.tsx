import React from "react";
import "./index.css";

export interface ProfileHeroProps {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  referenceId: string;
  onOpenMediaModal: (tab: "logo" | "banner") => void;
  onOpenDetailsModal: () => void;
  onTogglePreview: () => void;
  isPreviewActive: boolean;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  name,
  description,
  logoUrl,
  bannerUrl,
  referenceId,
  onOpenMediaModal,
  onOpenDetailsModal,
  onTogglePreview,
  isPreviewActive,
}) => {
  return (
    <div className="profile-hero-card">
      {/* 1. Cover Banner with Change Cover button */}
      <div
        className="profile-cover-banner"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      >
        <button
          type="button"
          className="profile-banner-btn"
          onClick={() => onOpenMediaModal("banner")}
          title="Change storefront cover banner"
        >
          <span>📷</span> Change Cover Photo
        </button>
      </div>

      {/* 2. Hero Body with generous, breathable spacing */}
      <div className="profile-header-body">
        <div className="profile-identity-group">
          {/* Signature Overlapping Squircle Avatar */}
          <div
            className="profile-squircle-avatar-wrap"
            onClick={() => onOpenMediaModal("logo")}
            title="Click to change restaurant logo"
          >
            <img
              src={logoUrl}
              alt="Restaurant Logo"
              className="profile-squircle-avatar"
            />
            <div className="profile-avatar-overlay">
              <span style={{ fontSize: "18px" }}>📷</span>
              <span>Change Logo</span>
            </div>
          </div>

          {/* Restaurant Metadata & Locked Title */}
          <div className="profile-details-content">
            <div className="profile-title-row">
              <h1 className="profile-restaurant-title">{name}</h1>
              <span className="badge-pro-pill">APPROVED ⚡</span>
              <span className="badge-locked-pill" title="Store name is locked as per legal registration">
                🔒 Registered Name
              </span>
            </div>

            <p className="profile-bio-text">{description}</p>

            <div className="profile-meta-row">
              <span className="badge-ref-id">Partner ID: {referenceId}</span>
              <span className="profile-meta-dot">•</span>
              <span className="profile-meta-sub">FSSAI & GST Verified Outlet</span>
            </div>

            {/* Pill Action Buttons */}
            <div className="profile-actions-row">
              <button
                type="button"
                className="btn-pill-dark"
                onClick={onOpenDetailsModal}
              >
                ✏️ Edit Store Details
              </button>
              <button
                type="button"
                className={`btn-pill-outline ${isPreviewActive ? "active-preview" : ""}`}
                onClick={onTogglePreview}
              >
                {isPreviewActive ? "Hide Customer Preview" : "📱 Live Customer Preview"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Right Stats & Verification Chips */}
        <div className="profile-stats-aside">
          <div className="profile-badge-icons">
            <div className="round-badge badge-orange" title="Pure Veg / Top Rated">
              ★
            </div>
            <div className="round-badge badge-purple" title="FSSAI Food Certified">
              F
            </div>
            <div className="round-badge badge-dark" title="GST Registered">
              G
            </div>
          </div>

          <div className="profile-stat-numbers">
            <div className="stat-item">
              <span className="stat-label">Rating</span>
              <span className="stat-value">4.8</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Dishes</span>
              <span className="stat-value">25</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Menus</span>
              <span className="stat-value">4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHero;
