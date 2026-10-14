import React from "react";
import Btn from "../Buttons/Button";
import "./index.css";

export interface ProfileDetailsCardProps {
  name: string;
  description: string;
  cuisines: string[];
  referenceId: string;
  onOpenDetailsModal: () => void;
}

export const ProfileDetailsCard: React.FC<ProfileDetailsCardProps> = ({
  name,
  description,
  cuisines,
  referenceId,
  onOpenDetailsModal,
}) => {
  return (
    <div className="profile-card">
      <div className="profile-card-header-row">
        <div>
          <h2>Store Details & Cuisines</h2>
          <p>Public description and food categories displayed to customers on discovery.</p>
        </div>
        <Btn variant="Secondary" onClick={onOpenDetailsModal}>
          ✏️ Edit Details
        </Btn>
      </div>

      <div className="profile-details-display-grid">
        {/* Field 1: Store Legal Name (Locked) */}
        <div className="detail-item-box">
          <span className="detail-label">
            Restaurant Legal Name <span className="detail-lock-tag">🔒 Locked</span>
          </span>
          <div className="detail-value-locked">
            <span className="detail-name-text">{name}</span>
            <span className="detail-lock-hint">
              Matches government registration. Contact support to request legal name change.
            </span>
          </div>
        </div>

        {/* Field 2: Description / Bio */}
        <div className="detail-item-box">
          <span className="detail-label">Store Tagline & Description</span>
          <p className="detail-desc-text">{description}</p>
        </div>

        {/* Field 3: Cuisine Categories */}
        <div className="detail-item-box">
          <span className="detail-label">Cuisine Specialties</span>
          <div className="cuisines-tag-container">
            {cuisines.map((cuisine) => (
              <span key={cuisine} className="cuisine-tag-chip selected">
                ✓ {cuisine}
              </span>
            ))}
          </div>
        </div>

        {/* Field 4: Reference ID */}
        <div className="detail-item-box">
          <span className="detail-label">Partner Reference ID</span>
          <div className="detail-ref-box">
            <code>{referenceId}</code>
            <span className="detail-copy-hint">Use this reference ID when contacting merchant support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailsCard;
