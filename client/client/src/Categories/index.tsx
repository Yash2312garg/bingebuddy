import { useEffect, useState } from "react";
import { Dropdown } from "../Components/Dropdown";
import "./index.css";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchMenu, type MenuState } from "../slices/menuSlice";
const Categories: React.FC = () => {


  const [selected, setSelected] = useState<MenuState | null>(null);
  const menus = useAppSelector((state) => state.menu.menus);
  const dispatch = useAppDispatch();
  const restaurant = useAppSelector((state) => state.auth.restaurant);


  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }
  }, [restaurant?.id, menus.length, dispatch]);
  
  console.log(selected)
  return (
    <>
      <Dropdown
        options={menus}
        selectedValue={selected}
        setSelectedValue={setSelected}
        additionalClass="Dropdown-cstm-wdth"
        disabled={menus.length === 0 ? true : false}
        getLabel={(menu)=>menu.name}
      >
        <Dropdown.Label>Menu Type</Dropdown.Label>
        <Dropdown.Trigger placeholder="Select menu type" />
        <Dropdown.Options />
      </Dropdown>
    </>
  );
};

export default Categories;
