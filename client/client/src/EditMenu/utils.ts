import type { Dispatch } from "@reduxjs/toolkit";
import type { CreateMenuState } from "../Types/Menu";
// import type { Restaurant } from "../Types/Restraurant";
import type { NavigateFunction } from "react-router-dom";
import { editMenu } from "../api/privateApi/restaurantMenu.privateApi";
import { editMenuState } from "../slices/menuSlice";

export const onSubmitEdit = async (
  data: CreateMenuState,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: NavigateFunction,
  dispatch: Dispatch,
  menu_id: undefined|number
) => {
  try {
    setLoading(true);
    // console.log(data,menu_id)
    if(!menu_id)  throw new Error("No restaurant id found");
    const new_menu_payload = {
      ...data,
      id: menu_id,
      available_from: formatTime(data.available_from),
      available_until: formatTime(data.available_until),
    };
    const response = await editMenu(new_menu_payload)
    if(response){
        //change the state of redux
        dispatch(editMenuState(new_menu_payload))
    }
    
    throw new Error("Not able to edit the menu try after some time" );
  } catch (e) {
    console.log("error while saving the edited data of the menu");
  } finally {
    navigate("/menu")
    setLoading(false);
  }
};

const formatTime = (time: string): string => {
  if (!time) return "";

  return time.length === 5 ? `${time}:00` : time;
};
