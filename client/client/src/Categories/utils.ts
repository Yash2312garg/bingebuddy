import { changeCategoryOrder, changeCategoryStatus, deleteCategory } from "../api/privateApi/restaurantCategories.privateApi"
import { changeCategoryOrderReducer, changeCategoryStatusReducer, deleteCategoryReducer, } from "../slices/categorySlice"
import type { AppDispatch } from "../store"
// import 
export const changeCategoryStatusUtils = async (category_id:number, status:boolean,dispatch: AppDispatch)=>{
    const result = await changeCategoryStatus(category_id, status)
    if (result){
        //dispatch the action 
        dispatch(changeCategoryStatusReducer(category_id))
        
    }else{
        throw new Error("Category status can't be changed")
    }
}

export const deleteCategoryUtils = async(category_id:number,menu_id:number, display_order:number ,dispatch: AppDispatch)=>{
    const result = await deleteCategory(category_id)
    if(result){
        //dispatch the action
        dispatch(deleteCategoryReducer({category_id,menu_id,display_order}))
    }else{
        throw new Error("Category cannot be deleted")
    }
}

export const changeCategoryOrderUtils = async (category_id: number, menu_id: number,  initial_order: number,final_order: number,  dispatch: AppDispatch) =>{
    
    const result  = await changeCategoryOrder(initial_order, final_order, category_id, menu_id)
    if(result && final_order > initial_order){
        dispatch(
        changeCategoryOrderReducer({
            category_id: category_id,
            menu_id: menu_id,
            initial_pos: initial_order,
            final_pos: final_order
        }),
        );
    }else if (result && final_order <initial_order){
    dispatch(
      changeCategoryOrderReducer({
        category_id: category_id,
        menu_id: menu_id,
            initial_pos: initial_order,
            final_pos: final_order
      }),
    );
    }
}