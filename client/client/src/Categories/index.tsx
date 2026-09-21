import { useEffect, useState } from "react";
import { Dropdown } from "../Components/Dropdown";
import "./index.css";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchMenu, type MenuState } from "../slices/menuSlice";
import NoMenuSection from "../Menus/NoMenuSection";
import NoCategoriesSection from "./NoCategoriesSection";
import {
  fetchCategories,
} from "../slices/categorySlice";
import CategoryRibbon from "../Components/CategoryRibbon";
import type { Category } from "../Types/Category";
import { useNavigate } from "react-router-dom";
import { changeCategoryOrderUtils, changeCategoryStatusUtils, deleteCategoryUtils } from "./utils";
import { useConfirm } from "../hooks/useConfirm";

const Categories: React.FC = () => {
  const [selectedMenu, setSelectedMenu] = useState<MenuState | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
 const { confirm, ConfirmDialog } = useConfirm();
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  const menuLoading = useAppSelector((state) => state.menu.loading);
  const categories = useAppSelector((state) => state.category.categories);
  const categoryLoading = useAppSelector((state) => state.category.loading);

  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }
    if (restaurant?.id && categories.length === 0) {
      dispatch(fetchCategories(restaurant.id));
    }
  }, [restaurant?.id, menus.length, categories.length, dispatch]);

  useEffect(() => {
    if (menus.length > 0 && selectedMenu === null) {
      setSelectedMenu(menus[0]);
    }
  }, [menus]);


  const handleToggleStatus = async (category: Category) => {
        const ok = await confirm({
      heading: `${category.is_active ? "Deactivate" : "Activate"} Menu`,
      content: `Are you sure you want to ${category.is_active ? "deactivate" : "activate"} "${category.name}"?`,
      confirmLabel: category.is_active ? "Deactivate" : "Activate",
    });
    if(ok){
    changeCategoryStatusUtils(category.id, !category.is_active, dispatch);

    }
  };
  
  const handleDelete = async (category: Category) => {

    const ok = await confirm({
      heading: "Delete Category",
      content: `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    })
    if (ok){
    deleteCategoryUtils(
      category.id,
      category.menu_id,
      category.display_order,
      dispatch,
    );
    }
    else{
      console.log("user cancelled the action");
    }

  };
  const handleEdit = (category: Category) => {
    navigate(`/categories/${category.id}`);
  };
  const filteredCategories = categories.filter(
    (c) => c.menu_id === selectedMenu?.id,
  );

  const lastPosition = filteredCategories.length;

  if (menuLoading) return <div>Loading...</div>;

  if (!menuLoading && menus.length === 0) return <NoMenuSection />;
  return (
    <>
      <Dropdown
        options={menus}
        selectedValue={selectedMenu}
        setSelectedValue={setSelectedMenu}
        additionalClass="Dropdown-cstm-wdth"
        disabled={menus.length === 0}
        getLabel={(menu) => menu.name}
        isOptionDisabled={(menu) => !menu.is_active}
      >
        <Dropdown.Label>Menu Type</Dropdown.Label>
        <Dropdown.Trigger placeholder="Select menu type" />
        <Dropdown.Options />
      </Dropdown>
      {/* <Btn>
        Create Category
      </Btn> */}

      {categoryLoading && <div>Loading categories...</div>}

      {!categoryLoading && selectedMenu && categories.length === 0 && (
        <NoCategoriesSection />
      )}

      {!categoryLoading && categories.length > 0 && (
        <div className="categories-cntr">
          {filteredCategories.map((category: Category) => (
            <CategoryRibbon
              key={category.id}
              category={category}
              onMoveUp={()=>changeCategoryOrderUtils(category.id, category.menu_id, category.display_order, category.display_order-1,dispatch)}
              onMoveDown={()=>changeCategoryOrderUtils(category.id, category.menu_id, category.display_order, category.display_order+1,dispatch)}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onEdit={handleEdit}
              disableUp={category.display_order === 1}
              disableDown={category.display_order === lastPosition}
            />
          ))}
        </div>
      )}
      <ConfirmDialog />
    </>
  );
};

export default Categories;
