import React, { useState } from "react";
import Modal from "../Modal";
import Btn from "../Buttons/Button";
import { Dropdown } from "../Dropdown";
import { FoodType, type FoodTypeInterface } from "../../Items/utils";
import type { SelectedCategoryFilterInterface } from "../../slices/itemSlice";
import "./index.css";

interface ItemFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: SelectedCategoryFilterInterface[];
  selectedCategory: SelectedCategoryFilterInterface;
  foodType: string;
  isAvailable: boolean | undefined;
  sortBy: "price" | "updated_at";
  sortOrder: "ASC" | "DESC";
  onApply: (filters: {
    selectedCategory: SelectedCategoryFilterInterface;
    foodType: "all" | "veg" | "nonveg";
    isAvailable: boolean | undefined;
    sortBy: "price" | "updated_at";
    sortOrder: "ASC" | "DESC";
  }) => void;
  onReset: () => void;
}

const ItemFilterModal: React.FC<ItemFilterModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  foodType,
  isAvailable,
  sortBy,
  sortOrder,
  onApply,
  onReset,
}) => {
  const [draftCategory, setDraftCategory] = useState<SelectedCategoryFilterInterface>(selectedCategory);
  const [draftFoodType, setDraftFoodType] = useState<FoodTypeInterface>(
    FoodType.find((f) => f.label === foodType) || FoodType[0]
  );
  const [draftIsAvailable, setDraftIsAvailable] = useState<boolean | undefined>(isAvailable);
  const [draftSortBy, setDraftSortBy] = useState<"price" | "updated_at">(sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState<"ASC" | "DESC">(sortOrder);

  const handleApply = () => {
    onApply({
      selectedCategory: draftCategory,
      foodType: draftFoodType.label as "all" | "veg" | "nonveg",
      isAvailable: draftIsAvailable,
      sortBy: draftSortBy,
      sortOrder: draftSortOrder,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter & Sort"
      size="md"
      footer={
        <>
          <Btn variant="Secondary" size="Medium" onClick={onReset}>
            Reset All
          </Btn>
          <Btn variant="Primary" size="Medium" onClick={handleApply}>
            Apply Filters
          </Btn>
        </>
      }
    >
      <div className="FilterModal-wrapper">
        {/* Category Section */}
        <div className="FilterModal-field">
          <label className="FilterModal-label">Category</label>
          <Dropdown
            options={categories}
            selectedValue={draftCategory}
            setSelectedValue={setDraftCategory}
            additionalClass="Dropdown-cstm-wdth FilterModal-dropdown"
            getLabel={(cat) => cat.name}
          >
            <Dropdown.Trigger placeholder="Select Category" />
            <Dropdown.Options />
          </Dropdown>
        </div>

        {/* Segmented Control: Dietary Preference */}
        <div className="FilterModal-field">
          <label className="FilterModal-label">Dietary Preference</label>
          <div className="SegmentedControl">
            {FoodType.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`SegmentedControl-btn ${draftFoodType.id === type.id ? "active" : ""}`}
                onClick={() => setDraftFoodType(type)}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Segmented Control: Availability */}
        <div className="FilterModal-field">
          <label className="FilterModal-label">Availability Status</label>
          <div className="SegmentedControl">
            <button
              type="button"
              className={`SegmentedControl-btn ${draftIsAvailable === undefined ? "active" : ""}`}
              onClick={() => setDraftIsAvailable(undefined)}
            >
              All
            </button>
            <button
              type="button"
              className={`SegmentedControl-btn ${draftIsAvailable === true ? "active" : ""}`}
              onClick={() => setDraftIsAvailable(true)}
            >
              Available
            </button>
            <button
              type="button"
              className={`SegmentedControl-btn ${draftIsAvailable === false ? "active" : ""}`}
              onClick={() => setDraftIsAvailable(false)}
            >
              Sold Out
            </button>
          </div>
        </div>

        <div className="FilterModal-divider" />

        {/* Sort Section */}
        <div className="FilterModal-field">
          <label className="FilterModal-label">Sort Items By</label>
          <div className="SortGrid">
            {/* Sort Option: Last Updated */}
            <button
              type="button"
              className={`SortCard ${draftSortBy === "updated_at" ? "selected" : ""}`}
              onClick={() => {
                if (draftSortBy === "updated_at") {
                  setDraftSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"));
                } else {
                  setDraftSortBy("updated_at");
                  setDraftSortOrder("DESC");
                }
              }}
            >
              <div className="SortCard-info">
                <span className="SortCard-title">Last Updated</span>
                <span className="SortCard-subtitle">
                  {draftSortBy === "updated_at"
                    ? draftSortOrder === "DESC"
                      ? "Newest First"
                      : "Oldest First"
                    : "Recently modified"}
                </span>
              </div>
              <span className="SortCard-icon">
                {draftSortBy === "updated_at" ? (draftSortOrder === "DESC" ? "↓" : "↑") : "↕"}
              </span>
            </button>

            {/* Sort Option: Price */}
            <button
              type="button"
              className={`SortCard ${draftSortBy === "price" ? "selected" : ""}`}
              onClick={() => {
                if (draftSortBy === "price") {
                  setDraftSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"));
                } else {
                  setDraftSortBy("price");
                  setDraftSortOrder("ASC");
                }
              }}
            >
              <div className="SortCard-info">
                <span className="SortCard-title">Item Price</span>
                <span className="SortCard-subtitle">
                  {draftSortBy === "price"
                    ? draftSortOrder === "ASC"
                      ? "Low to High"
                      : "High to Low"
                    : "Base price value"}
                </span>
              </div>
              <span className="SortCard-icon">
                {draftSortBy === "price" ? (draftSortOrder === "ASC" ? "↑" : "↓") : "↕"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ItemFilterModal;