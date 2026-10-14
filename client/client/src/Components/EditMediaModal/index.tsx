import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import Btn from "../Buttons/Button";
import DragAndDrop from "../DragAndDrop/DragAndDrop";
import type { FileWithPreview } from "../../Types/DragAndDrop";
import "./index.css";

export interface EditMediaModalProps {
  isOpen: boolean;
  initialTab?: "logo" | "banner";
  currentLogo: string;
  currentBanner: string;
  onClose: () => void;
  onRequestConfirm: (type: "logo" | "banner", newPreview: string) => void;
}

export const EditMediaModal: React.FC<EditMediaModalProps> = ({
  isOpen,
  initialTab = "logo",
  currentLogo,
  currentBanner,
  onClose,
  onRequestConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<"logo" | "banner">(initialTab);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);

  // Sync initial tab and reset pending states when opening
  useEffect(() => {
    setActiveTab(initialTab);
    setPendingLogo(null);
    setPendingBanner(null);
  }, [initialTab, isOpen]);

  const handleLogoDrop = (files: FileWithPreview[]) => {
    if (files.length > 0) {
      const preview = files[0].preview || URL.createObjectURL(files[0]);
      setPendingLogo(preview);
    }
  };

  const handleBannerDrop = (files: FileWithPreview[]) => {
    if (files.length > 0) {
      const preview = files[0].preview || URL.createObjectURL(files[0]);
      setPendingBanner(preview);
    }
  };

  const handleApply = () => {
    if (activeTab === "logo" && pendingLogo) {
      onRequestConfirm("logo", pendingLogo);
    } else if (activeTab === "banner" && pendingBanner) {
      onRequestConfirm("banner", pendingBanner);
    }
  };

  const hasNewFile =
    (activeTab === "logo" && pendingLogo !== null) ||
    (activeTab === "banner" && pendingBanner !== null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store Branding & Imagery"
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
          <Btn variant="Secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="Primary" onClick={handleApply} disabled={!hasNewFile}>
            Review & Save Changes
          </Btn>
        </div>
      }
    >
      <div className="media-modal-body">
        {/* Tab switchers */}
        <div className="media-modal-tabs">
          <button
            type="button"
            className={`media-tab-pill ${activeTab === "logo" ? "active" : ""}`}
            onClick={() => setActiveTab("logo")}
          >
            Store Logo (1:1)
          </button>
          <button
            type="button"
            className={`media-tab-pill ${activeTab === "banner" ? "active" : ""}`}
            onClick={() => setActiveTab("banner")}
          >
            Cover Banner (16:9)
          </button>
        </div>

        {activeTab === "logo" ? (
          <div className="media-tab-panel">
            <div className="media-preview-row">
              <div className="media-current-preview">
                <span className="media-subhead">
                  {pendingLogo ? "New Logo Preview:" : "Current Logo:"}
                </span>
                <img
                  src={pendingLogo || currentLogo}
                  alt="Logo preview"
                  className="modal-squircle-preview"
                />
              </div>
              <div className="media-drop-zone">
                <span className="media-subhead">Upload New Logo (Square):</span>
                <DragAndDrop
                  accept={{ "image/*": [".png", ".jpg", ".jpeg", ".svg"] }}
                  maxFiles={1}
                  maxSize={5242880}
                  onChange={handleLogoDrop}
                  dragInactiveText="Drop square logo image here"
                />
                <span className="media-guideline">Recommended: 500x500px, PNG or JPG up to 5MB</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="media-tab-panel">
            <div className="media-preview-row">
              <div className="media-current-preview">
                <span className="media-subhead">
                  {pendingBanner ? "New Banner Preview:" : "Current Banner:"}
                </span>
                <div
                  className="modal-banner-preview-compact"
                  style={{ backgroundImage: `url(${pendingBanner || currentBanner})` }}
                />
              </div>
              <div className="media-drop-zone">
                <span className="media-subhead">Upload New Storefront Cover:</span>
                <DragAndDrop
                  accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                  maxFiles={1}
                  maxSize={5242880}
                  onChange={handleBannerDrop}
                  dragInactiveText="Drop landscape banner image here"
                />
                <span className="media-guideline">
                  Recommended: 1920x1080px (16:9), PNG or JPG up to 5MB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditMediaModal;
