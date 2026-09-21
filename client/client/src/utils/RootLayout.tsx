import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/redux";
import { getRestaurantInfo } from "../api/privateApi/getRestaurantInfo.privateApi";
import { logoutUser, setLoading, setUser } from "../slices/authSlice";
import axios from "axios";

const RootLayout: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const restaurantInfo = await getRestaurantInfo();
        dispatch(setUser(restaurantInfo));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          dispatch(logoutUser());
        } else {
          dispatch(setLoading(false));
        }
      } finally {
        dispatch(setLoading(false));
      }
    };
    initAuth();
  }, []); 

  return <Outlet />;
};

export default RootLayout;