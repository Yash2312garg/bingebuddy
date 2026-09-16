// import { setSelectedCatrgory, type SelectedCategoryFilterInterface } from "../slices/itemSlice";

import { changeItemStatus, deleteItemApi } from "../api/privateApi/getRestaurantItems.privateApi";
import { changeItemStatusReducer, deleteItemReducer } from "../slices/itemSlice";
import type { AppDispatch } from "../store";

// const dispatch = useAppDispatch()
export interface FoodTypeInterface {
  name: string;
  label: string;
  id: number;
}
export const FoodType:FoodTypeInterface[] = [
  { name: "All", label: "all", id: 2 },
  { name: "Vegeterian", label: "veg", id: 0 },
  { name: "Non-Vegeterian", label: "nonveg", id: 1 },
];


export const changeItemsStatusUtils = async (item_id:number, status:boolean,dispatch: AppDispatch)=>{
    const result = await changeItemStatus(item_id, status)
    console.log(result)
    if (result){
        dispatch(changeItemStatusReducer(item_id))
    }else{
        throw new Error("Category status can't be changed")
    }
}
export const deleteItemUtils = async (
  item_id: number,
  dispatch: AppDispatch
): Promise<boolean> => {
  const isDeleted = await deleteItemApi(item_id);

  if (isDeleted) {
    dispatch(deleteItemReducer(item_id));
    return true;
  }
  
  return false;
};