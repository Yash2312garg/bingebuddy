import type { NavigateFunction } from "react-router-dom";
import { createRestaurantItems, type AddRestaurantItems } from "../api/privateApi/getRestaurantItems.privateApi";
import type { AppDispatch } from "../store";
import { addItem } from "../slices/itemSlice";


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