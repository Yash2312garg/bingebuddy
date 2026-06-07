import type { CreateCategoryPayload } from "../../Types/Category";
import { privateApi } from "../../utils/api";

interface addCategoryPayload {
  menu_id: number;
  name: string;
  short_desc: string;
  long_desc: string;
  display_order: number;
  is_active: boolean;
  rules: JSON | null;
}

export const addNewCategory = async (data: addCategoryPayload) => {
  try {
    const response = await privateApi.post(
      "/restaurant/categories/addCategory",
      data,
      { withCredentials: true },
    );

    if (response.status === 201) {
      return response.data;
    }
    throw new Error("error adding new category");
  } catch (e) {
    console.log("error adding new category", e);
  }
};

export const getAllCategories = async (restaurant_id: number) => {
  try {
    const response = await privateApi.get(
      "/restaurant/categories/getAllCategories",
      {
        params: {
          restaurant_id: restaurant_id,
        },
        withCredentials: true,
      },
    );
    if (response.status === 200) {
      return response.data;
    }
    return [];
  } catch (e) {
    console.log("error fetching all the categories", e);
  }
};

export const changeCategoryStatus = async (
  category_id: number,
  status: boolean,
) => {
  try {
    const response = await privateApi.post(
      "/restaurant/categories/changeStatus",
      { category_id, status },
      { withCredentials: true },
    );
    if (response.status === 200) {
      return true;
    }
    return false;
  } catch (e) {
    console.log("error fetching all the categories", e);
    return false;
  }
};

export const deleteCategory = async (category_id: number) => {
  try {
    const response = await privateApi.post(
      "restaurant/categories/deleteCategory",
      {},
      {
        params: {
          category_id: category_id,
        },
      },
    );
    if (response.status == 201) {
      return true;
    }
    return false;
  } catch (e) {
    console.log("error deleting  the category", e);
    return false;
  }
};

export const changeCategoryOrder = async (
  initial_order: number,
  final_order: number,
  category_id: number,
  menu_id: number,
) => {
  try {
    const response = await privateApi.post(
      "restaurant/categories/changeOrder",
      { initial_order, final_order, category_id, menu_id },
    );
    if (response.status === 201) {
      return true;
    }
    return false;
  } catch (e) {
    console.log("error changing order of the category", e);

    return false;
  }
};

export const editCategory = async (
  new_category_data: CreateCategoryPayload,
  category_id: number,
) => {
  try {
    const response = await privateApi.post(
      "restaurant/categories/editCategory",
      { ...new_category_data, "category_id":category_id },
    );
    if (response.status === 200) {
      return true;
    }
    return false;
  } catch (e) {
    console.log("error edit category", e);
  }
};
