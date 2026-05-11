import "./App.css";

import {  createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./Login";
import VerifyOTP from "./Verify_Otp";
import LandingPage from "./LandingPage";
import PreLoginSteps from "./PreLoginSteps";
import PendingVerificationScreen from "./Verify_Otp/PendingVerific";
import Home from "./Home";
import Menu from "./Menu";
import { ProtectedRoutes } from "./utils/ProtectectRoutes";
import AuthInitializer from "./utils/AuthInitializer";

function App() {

  const router = createBrowserRouter([
    //public routes
    { path:"/" ,element:<LandingPage /> },
    { path:"/login" ,element:<Login /> },
    { path:"/verify-otp" ,element:<VerifyOTP /> },
    { path:"/login/info", element:<PreLoginSteps />},
    { path: "/login/status=pending", element:<PendingVerificationScreen/>},


    //private routes
    {element: <ProtectedRoutes/>,   
      children:[ 
      { path: "/home", element : <Home/>},
      { path: "/menu", element : <Menu/>}]
    },

    // error routes
    { path: "*", element: <div>404 Not Found</div> }]
)

  return (
    <>
      <AuthInitializer></AuthInitializer>
      <RouterProvider router={router}/>
    </>
  );
}

export default App;
