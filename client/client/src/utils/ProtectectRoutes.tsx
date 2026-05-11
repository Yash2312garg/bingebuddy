import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";



export const ProtectedRoutes = ()=>{
    const user = useAppSelector((state)=>state.auth.user);
    const isLoading = useAppSelector((state)=>state.auth.isLoading);
    const location = useLocation();
    if (isLoading) return <div>Checking Session. Please wait.....</div>

    if(!user){
        return <Navigate to={"/login"} state={{from:location}} replace/>
    }
    return <Outlet/>

}