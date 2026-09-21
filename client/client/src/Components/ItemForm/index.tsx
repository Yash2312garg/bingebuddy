import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Btn from "../Buttons/Button";
import { Input } from "../Input/Input";
import { Dropdown } from "../Dropdown";
import Checkbox from "../Checkbox";
import type { Category } from "../../Types/Category";
import type { AddRestaurantItems } from "../../api/privateApi/getRestaurantItems.privateApi";
import { onSubmitCreate, onSubmitEdit } from "../../CreateItems/utils";
import { useAppDispatch } from "../../hooks/redux";
import "./index.css";

interface SpiceLevel {
  name: string;
  id: number;
}

interface InitialFormData {
  categories: Category[];
  spiceLevel: SpiceLevel[];
}

interface ItemFormProps {
  mode: "create" | "edit";
  initialData: InitialFormData;
  item_id?: number;
  editData?: AddRestaurantItems;
}

const ItemForm: React.FC<ItemFormProps> = ({
  mode,
  initialData,
  item_id,
  editData,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState<AddRestaurantItems>({
    category_id: initialData.categories[0]?.id ?? 0,
    name: "",
    short_desc: "",
    long_desc: "",
    base_price: 0,
    is_available: true,
    is_veg: true,
    spice_level: initialData.spiceLevel[0]?.name ?? "Mild",
    prep_time: 0,
    tags: null,
    img_url: null,
  });

  // Populate fields in Edit Mode
  useEffect(() => {
    if (mode === "edit" && editData) {
      setItemData(editData);
    }
  }, [mode, editData]);

  // Dropdown selections
  const currentCategory =
    initialData.categories.find((c) => c.id === itemData.category_id) ||
    initialData.categories[0];

  const currentSpice =
    initialData.spiceLevel.find((s) => s.name === itemData.spice_level) ||
    initialData.spiceLevel[0];

  // Input Change Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setItemData((prev) => ({
      ...prev,
      [name]: type === "number" ? Math.max(0, Number(value)) : value,
    }));
  };

  const handleCheckboxChange =
    (name: "is_available" | "is_veg") => (checked: boolean) => {
      setItemData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    };

  const handleCategoryChange = (category: Category) => {
    setItemData((prev) => ({ ...prev, category_id: category.id }));
  };

  const handleSpiceChange = (spice: SpiceLevel) => {
    setItemData((prev) => ({ ...prev, spice_level: spice.name }));
  };

  const handleSubmit = () => {
    if (mode === "create") {
      onSubmitCreate(itemData, setLoading, navigate, dispatch);
    } else if (mode === "edit" && item_id) {
      onSubmitEdit(item_id, itemData, setLoading, navigate, dispatch);
    }
  };

  const isFormInvalid =
    !itemData.name.trim() ||
    !itemData.short_desc.trim() ||
    itemData.base_price <= 0 ||
    itemData.prep_time <= 0 ||
    !itemData.category_id ||
    !itemData.spice_level;

  return (
    <div className="Items-Form-cntr">
      {/* Name and Category */}
      <div className="Item-First-Part">
        <Input>
          <Input.Label>Item Name *</Input.Label>
          <Input.Field
            placeholder="Item name"
            name="name"
            value={itemData.name}
            onChange={handleInputChange}
          />
        </Input>

        <Dropdown
          options={initialData.categories}
          selectedValue={currentCategory}
          setSelectedValue={handleCategoryChange}
          additionalClass="Item-Dropdown-cstm-wdth"
          getLabel={(category) => category.name}
          isOptionDisabled={(category) => !category.is_active}
        >
          <Dropdown.Label>Category Type *</Dropdown.Label>
          <Dropdown.Trigger placeholder="Select Category" />
          <Dropdown.Options />
        </Dropdown>
      </div>

      {/* Descriptions */}
      <Input>
        <Input.Label>Short Description *</Input.Label>
        <Input.Field
          placeholder="Short Description..."
          name="short_desc"
          value={itemData.short_desc}
          onChange={handleInputChange}
        />
      </Input>

      <Input>
        <Input.Label>Long Description</Input.Label>
        <Input.Field
          placeholder="Long Description..."
          name="long_desc"
          value={itemData.long_desc}
          onChange={handleInputChange}
        />
      </Input>

      {/* Pricing, Prep Time & Spice */}
      <div className="Item-Second-Part">
        <Input>
          <Input.Label>Base Price *</Input.Label>
          <Input.Field
            placeholder="0"
            name="base_price"
            type="number"
            value={itemData.base_price || ""}
            onChange={handleInputChange}
          />
        </Input>

        <Input>
          <Input.Label>Prep Time (min) *</Input.Label>
          <Input.Field
            placeholder="0"
            name="prep_time"
            type="number"
            value={itemData.prep_time || ""}
            onChange={handleInputChange}
          />
        </Input>

        <Dropdown
          options={initialData.spiceLevel}
          selectedValue={currentSpice}
          setSelectedValue={handleSpiceChange}
          additionalClass="Item-Dropdown-cstm-wdth"
          getLabel={(spice) => spice.name}
        >
          <Dropdown.Label>Spice Level *</Dropdown.Label>
          <Dropdown.Trigger placeholder="Select spice level" />
          <Dropdown.Options />
        </Dropdown>
      </div>

      {/* Checkboxes */}
      <div className="Item-Second-Part">
        <Checkbox
          id="item_active"
          label="Available"
          checked={!!itemData.is_available}
          onChange={handleCheckboxChange("is_available")}
        />
        <Checkbox
          id="item_veg"
          label="Vegetarian"
          checked={!!itemData.is_veg}
          onChange={handleCheckboxChange("is_veg")}
        />
      </div>

      {/* Variants (Placeholder for future feature) */}
      <div className="Item-varients-inputs">
        <h3>Variants</h3>
        <p>Select variants that apply to this item (e.g., Size, Crust Type)</p>
      </div>

      {/* Add-ons (Placeholder for future feature) */}
      <div className="Item-varients-inputs">
        <h3>Add-ons</h3>
        <p>Select Add-ons that apply to this item</p>
      </div>

      {/* Action Buttons */}
      <div className="Item-action-btn">
        <Btn variant="Secondary" onClick={() => navigate("/items")}>
          Cancel
        </Btn>
        <Btn
          variant="Primary"
          disabled={isFormInvalid || loading}
          onClick={handleSubmit}
        >
          {loading
            ? "Saving..."
            : mode === "create"
            ? "Create"
            : "Save Changes"}
        </Btn>
      </div>
    </div>
  );
};

export default ItemForm;