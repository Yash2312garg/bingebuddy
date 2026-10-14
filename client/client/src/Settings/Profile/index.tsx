import React, { useState } from "react";
import "./index.css";
import { ProfileHero } from "../../Components/ProfileHero";
import { ProfileDetailsCard } from "../../Components/ProfileDetailsCard";
import { EditMediaModal } from "../../Components/EditMediaModal";
import { EditDetailsModal } from "../../Components/EditDetailsModal";
import { ConfirmActionPopup } from "../../Components/ConfirmActionPopup";
import Btn from "../../Components/Buttons/Button";
import { useAppSelector } from "../../hooks/redux";

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_LOGO =
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=300&q=80";

const ProfileSettings: React.FC = () => {
  const restaurantFromStore = useAppSelector((state) => state.auth.restaurant);

  // Core Restaurant Profile State
  const [name] = useState<string>("Delhi Chaat Express");
  const [description, setDescription] = useState<string>(
    "Authentic Chandni Chowk street food, stuffed parathas, and spiced chaats served fresh daily."
  );
  const [cuisines, setCuisines] = useState<string[]>([
    "Street Food",
    "Chaat",
    "North Indian",
  ]);

  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  const [bannerUrl, setBannerUrl] = useState<string>(DEFAULT_BANNER);

  // Modals Visibility
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState<"logo" | "banner">("logo");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Customer Mobile Preview Toggle
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Confirmation Popup State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    content: "",
    onConfirm: () => {},
  });

  const referenceId = restaurantFromStore?.reference_id || "DEL-CH101";

  // Trigger Media Modal for Logo or Banner
  const handleOpenMediaModal = (tab: "logo" | "banner") => {
    setMediaModalTab(tab);
    setIsMediaModalOpen(true);
  };

  // Called when user clicks "Update Logo / Banner" inside EditMediaModal
  const handleRequestConfirmMedia = (type: "logo" | "banner", newPreview: string) => {
    setConfirmDialog({
      isOpen: true,
      title: type === "logo" ? "Update Restaurant Logo?" : "Update Storefront Cover?",
      content:
        type === "logo"
          ? "Are you sure you want to update your store logo? This branding will appear on customer orders and menus."
          : "Are you sure you want to change your storefront banner? Customers will see this immediately upon discovering your restaurant.",
      onConfirm: () => {
        if (type === "logo") {
          setLogoUrl(newPreview);
        } else {
          setBannerUrl(newPreview);
        }
        setIsMediaModalOpen(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Called when user clicks "Review & Save Changes" inside EditDetailsModal
  const handleRequestConfirmDetails = (newDesc: string, newCuisines: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: "Save Changes to Store Details?",
      content:
        "Are you sure you want to update your store description and cuisine tags? Customers on the discovery app will see these changes.",
      onConfirm: () => {
        setDescription(newDesc);
        setCuisines(newCuisines);
        setIsDetailsModalOpen(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="profile-container-scroll">
      <div className="profile-page-container">
        {/* ==================================================================
            1. Hero Card: Banner, Squircle Avatar, Locked Name, Badges & Stats
           ================================================================== */}
        <ProfileHero
          name={name}
          description={description}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          referenceId={referenceId}
          onOpenMediaModal={handleOpenMediaModal}
          onOpenDetailsModal={() => setIsDetailsModalOpen(true)}
          onTogglePreview={() => setIsPreviewActive((prev) => !prev)}
          isPreviewActive={isPreviewActive}
        />

        {/* ==================================================================
            2. Live Customer Mobile Preview (Toggled by Button)
           ================================================================== */}
        {isPreviewActive && (
          <div className="live-preview-section">
            <div className="live-preview-header">
              <h3>Customer App View (Live Preview)</h3>
              <p>This is how your storefront card and page appears to customers ordering on BingeBuddy mobile.</p>
            </div>
            <div className="live-preview-container">
              <div className="customer-mobile-mockup">
                <div
                  className="mockup-banner"
                  style={{ backgroundImage: `url(${bannerUrl})` }}
                />
                <div className="mockup-content">
                  <img src={logoUrl} alt="Logo preview" className="mockup-logo" />
                  <h3 className="mockup-title">{name}</h3>
                  <p className="mockup-desc">{description}</p>
                  <div className="mockup-tags">
                    {cuisines.map((tag) => (
                      <span key={tag} className="mockup-tag">
                        {tag}
                      </span>
                    ))}
                    <span className="mockup-tag">⚡ 25-35 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            3. Store Details Presentation Card (With Edit Modal Trigger)
           ================================================================== */}
        <ProfileDetailsCard
          name={name}
          description={description}
          cuisines={cuisines}
          referenceId={referenceId}
          onOpenDetailsModal={() => setIsDetailsModalOpen(true)}
        />

        {/* ==================================================================
            4. Edit Media Modal (Tabs: Logo & Cover Banner)
           ================================================================== */}
        <EditMediaModal
          isOpen={isMediaModalOpen}
          initialTab={mediaModalTab}
          currentLogo={logoUrl}
          currentBanner={bannerUrl}
          onClose={() => setIsMediaModalOpen(false)}
          onRequestConfirm={handleRequestConfirmMedia}
        />

        {/* ==================================================================
            5. Edit Details Modal (Bio & Cuisines with locked Name)
           ================================================================== */}
        <EditDetailsModal
          isOpen={isDetailsModalOpen}
          storeName={name}
          initialDescription={description}
          initialCuisines={cuisines}
          onClose={() => setIsDetailsModalOpen(false)}
          onRequestConfirm={handleRequestConfirmDetails}
        />

        {/* ==================================================================
            6. Global Confirmation Dialog
           ================================================================== */}
        <ConfirmActionPopup open={confirmDialog.isOpen}>
          <ConfirmActionPopup.Heading>
            {confirmDialog.title}
          </ConfirmActionPopup.Heading>
          <ConfirmActionPopup.Content>
            {confirmDialog.content}
          </ConfirmActionPopup.Content>
          <ConfirmActionPopup.Actions>
            <Btn
              variant="Secondary"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Btn>
            <Btn variant="Primary" onClick={confirmDialog.onConfirm}>
              Confirm & Save
            </Btn>
          </ConfirmActionPopup.Actions>
        </ConfirmActionPopup>
      </div>
    </div>
  );
};

export default ProfileSettings;
