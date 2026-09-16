import React, { useEffect, useState } from "react";
import "./index.css";
import { Input } from "../Components/Input/Input";
import { Dropdown } from "../Components/Dropdown";
import { changeItemsStatusUtils, deleteItemUtils, FoodType, type FoodTypeInterface } from "./utils";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { useNavigate } from "react-router-dom";
import { fetchMenu } from "../slices/menuSlice";
import { fetchCategories } from "../slices/categorySlice";
import ItemCard from "../Components/ItemCard";
import { fetchItems,  searchQuery,  setSelectedCatrgory,  type ItemsState, type SelectedCategoryFilterInterface } from "../slices/itemSlice";
import { useConfirm } from "../hooks/useConfirm";


const Items: React.FC = () => {
  const [categoryDropDownItems, setCategoriesDropDownItems] = useState<SelectedCategoryFilterInterface[]>([{ name: "All Categories", id: -1 }]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useAppSelector((state)=>state.items.query)
  const foodType = useAppSelector((state)=> state.items.foodType)
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const selectedCategory = useAppSelector((state)=> state.items.selectedCategory)
  const menus = useAppSelector((state) => state.menu.menus);
  const items:ItemsState[] = useAppSelector(state=>state.items.items);
  const categories = useAppSelector((state) => state.category.categories);
  const [selectedFoodType, setSelectedFoodType] =useState<FoodTypeInterface | null>({ name: "All", label: "all", id: 2 });
   const { confirm, ConfirmDialog } = useConfirm();


  useEffect(() => {
    if (restaurant?.id && menus.length === 0) {
      dispatch(fetchMenu(restaurant.id));
    }

    if (restaurant?.id && categories.length === 0) {
      dispatch(fetchCategories(restaurant.id));
    }
    setCategoriesDropDownItems([
    { name: "All Categories", id: -1 },
    ...categories,
  ]);
  }, [restaurant?.id, menus.length, categories.length, dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      if (restaurant && restaurant.id && items) {
       dispatch(fetchItems({restaurant_id:restaurant.id, page:1,limit:6,query,foodType,selectedCategory}))
      }
    };
    fetchData();
  }, [restaurant?.id,query,selectedCategory]);
 
  const handleCategoryChangeFilter= (category:SelectedCategoryFilterInterface) =>{
    dispatch(setSelectedCatrgory(category))
  } 
  const onToggleStatus = async (item:ItemsState)=>{
      const ok = await confirm({
          heading: `${item.is_available ? "Deactivate" : "Activate"} Menu`,
          content: `Are you sure you want to ${item.is_available ? "deactivate" : "activate"} "${item.item_name}"?`,
          confirmLabel: item.is_available ? "Deactivate" : "Activate",
        });
        if(ok){
        changeItemsStatusUtils(item.item_id, !item.is_available, dispatch);
        }
  }
  const onDeleteItem = async (item: ItemsState) => {
  try {
    const ok = await confirm({
      heading: "Delete Item",
      content: `Are you sure you want to delete "${item.item_name}"?`,
      confirmLabel: "Delete",
    });

    if (ok) {
      await deleteItemUtils(item.item_id, dispatch);
    }
  } catch (err) {
    console.log("Deletion cancelled or error occurred:", err);
  }
};
  return (  
    <>
    <div className="ItemsPage-wrapper">
      <div className="ItemsPage-option-wrapper">
        <Input>
          <Input.Field
            type="search"
            placeholder="Search Items...."
            value={query}
            name="query"
            onChange={(event)=>dispatch(searchQuery(event.target.value))}
          ></Input.Field>
        </Input>

        <Dropdown
          options={categoryDropDownItems}
          selectedValue={selectedCategory}
          setSelectedValue={handleCategoryChangeFilter}
          additionalClass="Dropdown-cstm-wdth"
          disabled={categories.length === 0}
          getLabel={(category) => category.name}
          // isOptionDisabled={(menu) => !menu.is_active}
        >
          <Dropdown.Trigger placeholder="Select Category type" />
          <Dropdown.Options />
        </Dropdown>
        <Dropdown
          options={FoodType}
          selectedValue={selectedFoodType}
          setSelectedValue={setSelectedFoodType}
          additionalClass="Dropdown-cstm-wdth"
          // disabled={categories.length === 0}
          getLabel={(FoodType) => FoodType.name}
          // isOptionDisabled={(menu) => !menu.is_active}
        >
          <Dropdown.Trigger placeholder="Select menu type" />
          <Dropdown.Options />
        </Dropdown>
      </div>
      <div className="ItemsPage-content-cntr">
        {items && items.length > 0 ? (
          <div className="items-grid">
            {(items.map((item:ItemsState)=><ItemCard item= {item} onToggleStatus = {onToggleStatus}  onDeleteItem = {onDeleteItem}/>))}
          </div>
        ) : (
          <div className="NoItemFound">
            No items yet. Create your first menu item!
          </div>
        )}
      </div>
    </div>
     <ConfirmDialog />
    </>
  );
};

export default Items;

