import { useEffect, useState } from "react";
import NoMenuSection from "./NoMenuSection";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { changeStatus, deleteMenuState, fetchMenu, type MenuState } from "../slices/menuSlice";
import MenuCard from "../Components/MenuCard";
import type { Menu } from "../Types/Menu";
import "./index.css";
import { useConfirm } from "../hooks/useConfirm";
import { changeStatusMenu, deleteMenu } from "../api/privateApi/restaurantMenu.privateApi";

const Menu: React.FC = () => {
  const dispatch = useAppDispatch();
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  const loading = useAppSelector((state) => state.menu.loading);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }
  }, [restaurant?.id, menus.length, dispatch]);

  const handleDelete = async (menu: MenuState) => {
    const ok = await confirm({
      heading: "Delete Menu",
      content: `Are you sure you want to delete "${menu.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (ok) {
      const result = await deleteMenu(menu.id)
      if(result){ 
        dispatch(deleteMenuState(menu.id))
      }else{
        console.log("some error occured")
      }
      
    } else {
      console.log("user cancelled the action");
    }
  };
  const handleDeactivate = async (menu: MenuState) => {
    const ok = await confirm({
      heading: `${menu.is_active ? "Deactivate" : "Activate"} Menu`,
      content: `Are you sure you want to ${menu.is_active ? "deactivate" : "activate"} "${menu.name}"?`,
      confirmLabel: menu.is_active ? "Deactivate" : "Activate",
    });

    if (ok) {
      
      const result = await changeStatusMenu({menu_id: menu.id, status:!menu.is_active })
      if(result){ 
        dispatch(changeStatus(menu.id))
      }else{
        console.log("some error occured")
      }
    } 
  };


  if (loading) {
    return <>loading</>;
  }
  if (menus.length == 0) {
    return <NoMenuSection />;
  }

  return (
    <>
      <div className="menu-grid-cntr">
        {menus.map((menu: MenuState) => (
          <MenuCard menu={menu} onDelete={() => handleDelete(menu)} onDeactivate={()=>handleDeactivate(menu)}/>
        ))}
      </div>
      <ConfirmDialog />
    </>
  );
};

export default Menu;
