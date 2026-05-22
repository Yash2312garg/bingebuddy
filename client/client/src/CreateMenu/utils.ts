import type { Dispatch } from "@reduxjs/toolkit";
import { addNewMenu } from "../api/privateApi/restaurantMenu.privateApi";
import type { CreateMenuState } from "../Types/Menu";
import type { Restaurant } from "../Types/Restraurant";
import type { NavigateFunction } from "react-router-dom";
import { addMenu } from "../slices/menuSlice";

export const onSubmit = async (
  data: CreateMenuState,
  userData: Restaurant,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: NavigateFunction,
  dispatch: Dispatch,
): Promise<void> => {
  try {
    setLoading(true);

    if (!userData.reference_id) {
      throw new Error("No restaurant id found");
    }

    const new_menu_payload = {
      ...data,
      restaurant_id: userData.id,
      available_from: formatTime(data.available_from),
      available_until: formatTime(data.available_until),
    };

    const response = await addNewMenu(new_menu_payload);

    if (response) {
      dispatch(
        addMenu({
          id: response.data.id,
          name: response.data.name,
          available_from: response.data.available_from,
          available_until: response.data.available_until,
          is_active: response.data.is_active,
          short_desc: response.data.short_desc,
          long_desc: response.data.long_desc,
          rules: response.data.rules,
        }),
      );
      //navigate back to menu:
      navigate("/menu");
    }
  } catch (e) {
    console.log("error while creating a new menu", e);
  } finally {
    setLoading(false);
  }
};

const formatTime = (time: string): string => {
  if (!time) return "";

  return time.length === 5 ? `${time}:00` : time;
};
