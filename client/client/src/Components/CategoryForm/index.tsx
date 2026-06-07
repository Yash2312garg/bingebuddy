import { useEffect, useState } from "react";
import { Input } from "../Input/Input";
import Btn from "../Buttons/Button";

import {
  useAppDispatch,
  // useAppSelector
} from "../../hooks/redux";
import { useNavigate } from "react-router-dom";
// import { onSubmitEdit } from "../../EditMenu/utils";
import "./index.css";
import type { Category, CreateCategoryPayload } from "../../Types/Category";
import { onSubmit, onSubmitEdit } from "../../CreateCategory/utils";
// import { editMenuSubmit } from "./utils" later

interface CategoryFormProps {
  mode: "create" | "edit";
  initialData?: Category;
  menu_id: number | undefined;
  filteredCategoriesLength?: number;
  disabledAllFields?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  initialData,
  menu_id,
  filteredCategoriesLength,
  disabledAllFields,
}) => {
  console.log(initialData);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
const [category, setCategory] =
  useState<CreateCategoryPayload>({
    name: "",
    short_desc: "",
    long_desc: "",
    is_active: false,
    rules: null,
    display_order: 1,
  });

useEffect(() => {
  if (mode === "edit" && initialData) {
    setCategory({
      name: initialData.name,
      short_desc: initialData.short_desc,
      long_desc: initialData.long_desc,
      is_active: initialData.is_active,
      rules: initialData.rules,
      display_order: initialData.display_order,
    });
  }

  if (
    mode === "create" &&
    filteredCategoriesLength !== undefined
  ) {
    setCategory((prev) => ({
      ...prev,
      display_order: filteredCategoriesLength + 1,
    }));
  }
}, [initialData, filteredCategoriesLength, mode]);

const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  if (name === "display_order") {
    const maxOrder = filteredCategoriesLength ?? 1;
    const numValue = Math.max(
      1,
      Math.min(Number(value), maxOrder)
    );

    setCategory((prev) => ({
      ...prev,
      display_order: numValue,
    }));

    return;
  }

  setCategory((prev) => ({
    ...prev,
    [name]: value,
  }));
};

  const isDisable =
    !category.name || !category.short_desc || !menu_id || disabledAllFields;

  // console.log("disabledAllFields",disabledAllFields,menu_id)
  const handleSubmit = () => {
    if (!menu_id) return;

    if (mode === "create") {
      onSubmit(category, menu_id, setLoading, navigate, dispatch);
    } else {
      if (!initialData || !initialData.id || !initialData.display_order) {
        throw new Error("catefory or initial data is mussibg");
      }
      onSubmitEdit(
        category,
        setLoading,
        navigate,
        dispatch,
        initialData.id,
        initialData.display_order,
        menu_id,
      );
    }
  };

  return (
    <div className="newMnue-cntr">
      <h3>{mode === "create" ? "New Category" : "Edit Category"}</h3>

      <div className="newMnue-top">
        <Input>
          <Input.Label>Category Name *</Input.Label>
          <Input.Field
            placeholder="Category name"
            name="name"
            value={category.name}
            onChange={onChange}
            disabled={disabledAllFields}
          />
        </Input>
        <Input>
          <Input.Label>Display Order *</Input.Label>
          <Input.Field
            name="display_order"
            value={category.display_order}
            onChange={onChange}
            disabled={disabledAllFields}
            type="number"
          />
        </Input>
      </div>
      <div className="newMnue-mid">
        <Input>
          <Input.Label>Short Description *</Input.Label>
          <Input.Field
            placeholder="Brief description"
            name="short_desc"
            value={category.short_desc}
            disabled={disabledAllFields}
            onChange={onChange}
          />
        </Input>
      </div>

      <div className="newMnue-mid">
        <Input>
          <Input.Label>Long Description</Input.Label>
          <Input.Field
            name="long_desc"
            value={category.long_desc}
            disabled={disabledAllFields}
            onChange={onChange}
          />
        </Input>
      </div>
      <div className="newMnue-actn">
        <Btn variant="Secondary" onClick={() => navigate("/categories")}>
          Cancel
        </Btn>

        <Btn
          variant="Primary"
          disabled={isDisable || loading}
          onClick={handleSubmit}
        >
          {mode === "create" ? "Create" : "Save Changes"}
        </Btn>
      </div>
    </div>
  );
};

export default CategoryForm;
