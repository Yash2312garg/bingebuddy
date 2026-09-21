import { useEffect, useState } from "react";
import CategoryForm from "../Components/CategoryForm";
import { Dropdown } from "../Components/Dropdown";
import { fetchMenu, type MenuState } from "../slices/menuSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchCategories } from "../slices/categorySlice";
import type { Category } from "../Types/Category";

const CreateCategory: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuState | null>(null);
  const menus = useAppSelector((state) => state.menu.menus);
  const dispatch = useAppDispatch();
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const categories = useAppSelector((state) => state.category.categories);

  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }
    if (restaurant?.id && categories.length === 0) {
      dispatch(fetchCategories(restaurant.id));
    }
  }, [restaurant?.id, menus.length, dispatch]);

  useEffect(() => {
    if (menus.length > 0 && selectedMenu === null) {
      setSelectedMenu(menus[0]);
    }
  }, [menus]);
  
  const filteredCategoriesLength = categories.filter(
    (category: Category) => category.menu_id === selectedMenu?.id,
  ).length;
  const disabledAllFields = selectedMenu ? false : true;
  return (
    <>
      <Dropdown
        options={menus}
        selectedValue={selectedMenu}
        setSelectedValue={setSelectedMenu}
        additionalClass="Dropdown-cstm-wdth"
        disabled={menus.length === 0 ? true : false}
        getLabel={(menu) => menu.name}
        isOptionDisabled={(menu) => !menu.is_active}
      >
        <Dropdown.Label>Select Menu</Dropdown.Label>
        <Dropdown.Trigger placeholder="Select menu type" />
        <Dropdown.Options />
      </Dropdown>
      <CategoryForm
        mode="create"
        menu_id={selectedMenu?.id}
        disabledAllFields={disabledAllFields}
        filteredCategoriesLength={filteredCategoriesLength}
      />
      ;
    </>
  );
};

export default CreateCategory;
