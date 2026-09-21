import { useEffect, useState } from "react";
import CategoryForm from "../Components/CategoryForm";
import { Dropdown } from "../Components/Dropdown";
import { fetchMenu, type MenuState } from "../slices/menuSlice";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchCategories } from "../slices/categorySlice";
import type { Category } from "../Types/Category";
import { useParams } from "react-router-dom";

const EditCategory: React.FC = () => {
  const { categoryId } = useParams();
  const dispatch = useAppDispatch();

  const [selectedMenu, setSelectedMenu] = useState<MenuState | null>(null);

  const menus = useAppSelector((state) => state.menu.menus);
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const categories = useAppSelector((state) => state.category.categories);

  const category = useAppSelector((state) =>
    state.category.categories.find((m) => m.id === Number(categoryId))
  );

  useEffect(() => {
    if (restaurant?.id) {
      if (menus.length === 0) dispatch(fetchMenu(restaurant.id));
      if (categories.length === 0) dispatch(fetchCategories(restaurant.id));
    }
  }, [restaurant?.id, menus.length, categories.length, dispatch]);

  useEffect(() => {
    if (category && menus.length > 0 && selectedMenu === null) {
      const matchingMenu = menus.find((m) => m.id === category.menu_id);
      if (matchingMenu) {
        setSelectedMenu(matchingMenu);
      }
    }
  }, [category, menus, selectedMenu]);


  if (!category || !selectedMenu) {
    return <div>Loading category details...</div>; 
  }

  const filteredCategoriesLength = categories.filter(
    (c: Category) => c.menu_id === selectedMenu.id
  ).length;

  return (
    <>
      <Dropdown
        options={menus}
        selectedValue={selectedMenu}
        setSelectedValue={setSelectedMenu}
        additionalClass="Dropdown-cstm-wdth"
        disabled={true}
        getLabel={(menu) => menu.name}
        isOptionDisabled={(menu) => !menu.is_active}
      >
        <Dropdown.Label>Select Menu</Dropdown.Label>
        <Dropdown.Trigger placeholder="Select menu type" />
        <Dropdown.Options />
      </Dropdown>

      <CategoryForm
        mode="edit"
        menu_id={selectedMenu.id}
        disabledAllFields={false}
        filteredCategoriesLength={filteredCategoriesLength}
        initialData={category}
      />
    </>
  );
};

export default EditCategory;