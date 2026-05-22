import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import MenuForm from "../Components/MenuForm";
import { useEffect } from "react";
import { fetchMenu } from "../slices/menuSlice";

const EditMenu: React.FC = () => {
  const { menuId } = useParams();
  const dispatch = useAppDispatch();
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }
  }, [restaurant?.id, menus.length, dispatch]);

  const menu = useAppSelector((state) =>
    state.menu.menus.find((m) => m.id === Number(menuId)),
  );

  if (!menu) {
    return <div>Menu not found</div>;
  }

  return <MenuForm mode="edit" initialData={menu} menu_id = {Number(menuId)}/>;
};

export default EditMenu;
