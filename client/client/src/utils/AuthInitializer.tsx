import { useEffect } from "react";
import { useAppDispatch } from "../hooks/redux"
import { getRestaurantInfo } from "../api/privateApi/getRestaurantInfo.privateApi";
import { logoutUser, setLoading, setUser } from "../slices/authSlice";

const AuthInitializer: React.FC = ()=>{

    const dispatch = useAppDispatch();

    useEffect(()=>{
        const initAuth = async()=>{
        try{
            const restaurantInfo = await getRestaurantInfo();
            dispatch(setUser(restaurantInfo));

        }catch(err){
            console.log(err,)
            dispatch(logoutUser())
        }finally{
            dispatch(setLoading(false));
        }
        }
        initAuth();
    },[])   
    return null;
}

export default AuthInitializer;