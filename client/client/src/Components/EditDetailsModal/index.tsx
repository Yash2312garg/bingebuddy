import React, { useState, useEffect } from "react";
import Modal from "../Modal";
import Btn from "../Buttons/Button";
import { Input } from "../Input/Input";
import "./index.css";

const ALL_CUISINES = [
  "North Indian",
  "Street Food",
  "Chaat",
  "Fast Food",
  "Mughlai",
  "Biryani",
  "Beverages",
  "Desserts",
  "South Indian",
  "Chinese",
  "Continental",
  "Bakery",
];

export interface EditDetailsModalProps {
  isOpen: boolean;
  storeName: string;
  initialDescription: string;
  initialCuisines: string[];
  onClose: () => void;
  onRequestConfirm: (newDescription: string, newCuisines: string[]) => void;
}

export const EditDetailsModal: React.FC<EditDetailsModalProps> = ({
  isOpen,
  storeName,
  initialDescription,
  initialCuisines,
  onClose,
  onRequestConfirm,
}) => {
  const [description, setDescription] = useState(initialDescription);
  const [cuisines, setCuisines] = useState<string[]>(initialCuisines);

  useEffect(() => {
    setDescription(initialDescription);
    setCuisines(initialCuisines);
  }, [initialDescription, initialCuisines, isOpen]);

  const toggleCuisine = (item: string) => {
    setCuisines((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleApply = () => {
    if (description.trim()) {
      onRequestConfirm(description, cuisines);
    }
  };

  const isDirty =
    description !== initialDescription ||
    JSON.stringify(cuisines) !== JSON.stringify(initialCuisines);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Store Details"
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
          <Btn variant="Secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="Primary" onClick={handleApply} disabled={!isDirty || !description.trim()}>
            Review & Save Changes
          </Btn>
        </div>
      }
    >
      <div className="details-modal-form">
        {/* Field 1: Restaurant Name (Locked) */}
        <div className="modal-field-group">
          <Input>
            <Input.Label>
              <span>Restaurant Name</span>
              <span className="field-locked-badge">🔒 Locked</span>
            </Input.Label>
            <Input.Field
              inputType="Search"
              value={storeName}
              disabled
              readOnly
              className="input-field-disabled"
            />
          </Input>
          <span className="field-hint">
            To change the registered legal name of your restaurant, please reach out to Partner Support.
          </span>
        </div>

        {/* Field 2: Description Textarea */}
        <div className="modal-field-group">
          <label className="profile-textarea-label">
            <span>Store Tagline & Description *</span>
            <span className="profile-textarea-count">{description.length}/300</span>
          </label>
          <textarea
            className="profile-textarea"
            value={description}
            maxLength={300}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Highlight your chef specials, ambiance, and food heritage..."
          />
        </div>

        {/* Field 3: Cuisine Selection */}
        <div className="modal-field-group">
          <label className="profile-textarea-label">
            <span>Select Cuisine Specialties (Click to toggle)</span>
            <span className="profile-textarea-count">{cuisines.length} selected</span>
          </label>
          <div className="cuisines-tag-container" style={{ marginTop: "6px" }}>
            {ALL_CUISINES.map((item) => {
              const isSelected = cuisines.includes(item);
              return (
                <span
                  key={item}
                  className={`cuisine-tag-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleCuisine(item)}
                >
                  {isSelected ? "✓ " : "+ "}
                  {item}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EditDetailsModal;
