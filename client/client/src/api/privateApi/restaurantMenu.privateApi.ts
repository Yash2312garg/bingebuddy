import { privateApi } from "../../utils/api";

export interface NewMenuPayload {
  restaurant_id: number;
  name: string;
  short_desc: string;
  long_desc: string;
  is_active: boolean;
  available_from: string;
  available_until: string;
  rules: null | JSON;
}

export interface changeStatusMenuPayload {
  menu_id: number;
  status: boolean;
}

interface EditMenuPayload{
  id: number
  name: string;
  short_desc: string;
  long_desc: string;
  is_active: boolean;
  available_from: string;
  available_until: string;
  rules: null | JSON;
}
export const addNewMenu = async (data: NewMenuPayload) => {
  try {
    if (data.restaurant_id === null) {
      throw new Error("no user found");
    }
    const response = await privateApi.post("restaurant/menu/addMenu", data, {
      withCredentials: true,
    });
    if (response.status === 201) {
      return response.data;
    }
  } catch (e) {
    console.log("error while creating menu");
  }
};

export const changeStatusMenu = async (data: changeStatusMenuPayload) => {
  try {
    const response = await privateApi.post(
      "restaurant/menu/changeStatus",
      data,
      { withCredentials: true },
    );
    if (response.status === 200) {
      return response.data;
    }
  } catch (e) {
    console.log("error while creating menu");
  }
};

export const deleteMenu = async (menu_id: number) => {
  try {
    const response = await privateApi.post("restaurant/menu/deleteMenu",{}, {
      params: { menu_id },
      withCredentials: true,
    });
    if (response.status === 201) {
      return response.data;
    }
  } catch (e) {
    console.log("error occured while deleting the menu", e);
  }
};

export const getAllMenu = async (restaurant_id: number) => {
  try {
    const response = await privateApi.get("restaurant/menu/getAllMenu", {
      params: {
        restaurant_id: restaurant_id,
      },
      withCredentials: true,
    });
    if (response.status === 200) {
      return response.data.data;
    }
  } catch (e) {
    console.log("error fetching the menu from the backend", e);
  }
};


export const editMenu = async (data: EditMenuPayload)=>{
  try{
    const response = await privateApi.put("restaurant/menu/editMenu", data,{withCredentials: true});
   if (response.status===200){
    return response.data
   }
   return null
  }catch(e){
    console.log("error saving edited menu data to the backend", e);

  }
}