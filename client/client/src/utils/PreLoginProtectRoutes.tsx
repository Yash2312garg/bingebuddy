import { Navigate, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { useEffect } from "react";
import { logoutUser, setLoading, setUser } from "../slices/authSlice";
import { getRestaurantInfo } from "../api/privateApi/getRestaurantInfo.privateApi";
import CheckLoginScreen from "../CheckLoginScreen";

export const PreLoginProtectRoutes: React.FC = () => {
    const dispatch = useAppDispatch();

    useEffect(()=>{
        const initAuth = async()=>{
            try{
                const restaurantInfo = await getRestaurantInfo();
                dispatch(setUser(restaurantInfo));
                
            }catch(err){
                dispatch(logoutUser())
            }finally{
                dispatch(setLoading(false));
            }

        }
        initAuth();
    })

    const user = useAppSelector((state) => state.auth.user);
    const isLoading = useAppSelector((state)=>state.auth.isLoading);
    // already authenticated
    if (isLoading) return <CheckLoginScreen/>

    if (user) {
        return <Navigate to="/home" replace />;
    }

    // allow public pages
    return <Outlet />;
};
