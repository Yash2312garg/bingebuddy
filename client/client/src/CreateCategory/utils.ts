// import type { Dispatch } from "@reduxjs/toolkit";
import type { AppDispatch } from "../store";
import type { NavigateFunction } from "react-router-dom";
import type { CreateCategoryPayload } from "../Types/Category";
import { addNewCategory, editCategory } from "../api/privateApi/restaurantCategories.privateApi";
import { addCategory, editCategoryReducer } from "../slices/categorySlice";

export const onSubmit = async (
  data: CreateCategoryPayload,
  menu_id: number,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: NavigateFunction,
  dispatch: AppDispatch,
) => {
  try {
    setLoading(true);
    const response = await addNewCategory({ ...data, menu_id: menu_id });
    if (response) {
      dispatch(addCategory(response.data));
      console.log(response);
    }
  } catch (e) {
    console.log("error while creating new category", e);
  } finally {
    setLoading(false);
    navigate("/categories");
  }
};


export const onSubmitEdit = async (
        category:CreateCategoryPayload,
        setLoading:React.Dispatch<React.SetStateAction<boolean>>, 
        navigate:NavigateFunction,
        dispatch: AppDispatch,
        category_id: number,
        initial_order: number,
        menu_id: number
)=>{
    try{
        setLoading(true)
        const response = await editCategory(category,category_id)
        if (response){
            const dispatcherCategorydata = {...category,id: category_id, menu_id:menu_id}
            dispatch(editCategoryReducer(
                {updatedCategory:dispatcherCategorydata,
                initial_order}
            ))
            // console.log("data is editd")
            navigate("/categories")
        }

    }catch(e){
        console.log("error while editing  category", e);
    }finally{

    }
}