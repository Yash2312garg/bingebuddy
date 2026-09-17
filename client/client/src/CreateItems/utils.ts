import type { NavigateFunction } from "react-router-dom";
import { createRestaurantItems, editRestaurantItem, type AddRestaurantItems } from "../api/privateApi/getRestaurantItems.privateApi";
import type { AppDispatch } from "../store";
import { addItem,editItemState } from "../slices/itemSlice";


export const onSubmitCreate = async (
        data: AddRestaurantItems,
         setLoading: React.Dispatch<React.SetStateAction<boolean>>,
         navigate: NavigateFunction,
         dispatch: AppDispatch,

)=>{
      try {
        setLoading(true);
        const response = await createRestaurantItems(data);
        if (response) {
          dispatch(addItem(response.data));
        }
      } catch (e) {
        console.log("error while creating new category", e);
      } finally {
        setLoading(false);
        navigate("/items");
      }
}

export const onSubmitEdit = async (
  item_id: number,
  data: AddRestaurantItems,
  setLoading: (val: boolean) => void,
  navigate: NavigateFunction,
  dispatch: AppDispatch
) => {
  try {
    setLoading(true);
    const response = await editRestaurantItem(item_id, data);

    if (response) {
      // Update Redux state
      dispatch(
        editItemState({
          item_id,
          item_name: data.name,
          item_short_desc: data.short_desc,
          item_long_desc: data.long_desc,
          base_price: data.base_price,
          is_available: data.is_available,
          is_veg: data.is_veg,
          spice_level: data.spice_level,
          prep_time: data.prep_time,
          category_id: data.category_id,
          menu_id: 0,
          item_created_at: "",
          item_updated_at: new Date().toISOString(),
        })
      );
      navigate("/items");
    }
  } catch (error) {
    console.error("Error editing item:", error);
  } finally {
    setLoading(false);
  }
};