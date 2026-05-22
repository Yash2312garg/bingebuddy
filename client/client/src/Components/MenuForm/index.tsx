import { useState } from "react";
import { Input } from "../Input/Input";
import Btn from "../Buttons/Button";
import type { CreateMenuState } from "../../Types/Menu";
import type { MenuState } from "../../slices/menuSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { useNavigate } from "react-router-dom";
import { onSubmit } from "../../CreateMenu/utils";
import { onSubmitEdit } from "../../EditMenu/utils";
import "./index.css"
// import { editMenuSubmit } from "./utils" later

interface MenuFormProps {
  mode: "create" | "edit";
  initialData?: MenuState;
  menu_id?: undefined|number
}

const MenuForm: React.FC<MenuFormProps> = ({
  mode,
  initialData,
  menu_id
}) => {
  const restaurantInfo = useAppSelector(
    (state) => state.auth.restaurant
  );

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [menu, setMenu] = useState<CreateMenuState>({
    name: initialData?.name ?? "",
    short_desc: initialData?.short_desc ?? "",
    long_desc: initialData?.long_desc ?? "",
    available_from: initialData?.available_from ?? "",
    available_until: initialData?.available_until ?? "",
    is_active: initialData?.is_active ?? false,
    rules: null,
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMenu((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isDisable =
    !menu.name ||
    !menu.short_desc ||
    !menu.available_from ||
    !menu.available_until;

  const handleSubmit = () => {
    if (!restaurantInfo) return;

    if (mode === "create") {
      onSubmit(
        menu,
        restaurantInfo,
        setLoading,
        navigate,
        dispatch
      );
    } else {
      
      onSubmitEdit(
        menu,
        setLoading,
        navigate,
        dispatch,
        menu_id
      )
    }
  };

  return (
    <div className="newMnue-cntr">
      <h3>
        {mode === "create"
          ? "New Menu"
          : "Edit Menu"}
      </h3>

      <div className="newMnue-top">
        <Input>
          <Input.Label>Menu Name *</Input.Label>
          <Input.Field
            placeholder="Menu name"
            name="name"
            value={menu.name}
            onChange={onChange}
          />
        </Input>

        <Input>
          <Input.Label>
            Short Description *
          </Input.Label>
          <Input.Field
            placeholder="Brief description"
            name="short_desc"
            value={menu.short_desc}
            onChange={onChange}
          />
        </Input>
      </div>

      <div className="newMnue-mid">
        <Input>
          <Input.Label>
            Long Description
          </Input.Label>
          <Input.Field
            name="long_desc"
            value={menu.long_desc}
            onChange={onChange}
          />
        </Input>
      </div>

      <div className="newMnue-top">
        <Input>
          <Input.Label>
            Available From
          </Input.Label>
          <Input.Field
            type="time"
            name="available_from"
            value={menu.available_from}
            onChange={onChange}
          />
        </Input>

        <Input>
          <Input.Label>
            Available Until
          </Input.Label>
          <Input.Field
            type="time"
            name="available_until"
            value={menu.available_until}
            onChange={onChange}
          />
        </Input>
      </div>

      <div className="newMnue-actn">
        <Btn
          variant="Secondary"
          onClick={() => navigate("/menu")}
        >
          Cancel
        </Btn>

        <Btn
          variant="Primary"
          disabled={isDisable || loading}
          onClick={handleSubmit}
        >
          {mode === "create"
            ? "Create"
            : "Save Changes"}
        </Btn>
      </div>
    </div>
  );
};

export default MenuForm;