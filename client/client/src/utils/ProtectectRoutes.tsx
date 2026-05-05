import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext"



export const ProtectedRoutes = ()=>{
    const {user, isLoading} = useAuth();
    const location = useLocation();
    console.log(user,"user")
    if (isLoading) return <div>Checking Session. Please wait.....</div>

    if(!user){
        return <Navigate to={"/login"} state={{from:location}} replace/>
    }
    return <Outlet/>

}