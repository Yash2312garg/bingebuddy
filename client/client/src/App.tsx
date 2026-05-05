import "./App.css";

import { BrowserRouter, createBrowserRouter, Route, RouterProvider, Routes } from "react-router-dom";
import Login from "./Login";
import VerifyOTP from "./Verify_Otp";
import LandingPage from "./LandingPage";
import PreLoginSteps from "./PreLoginSteps";
import PendingVerificationScreen from "./Verify_Otp/PendingVerific";
import Home from "./Home";
import Menu from "./Menu";
import { ProtectedRoutes } from "./utils/ProtectectRoutes";
import { AuthProvider } from "./context/authContext";

function App() {

  const router = createBrowserRouter([
    // ── Public routes ──────────────────────────
    {path: "/", element: <LandingPage/>},
    { path:"/" ,element:<LandingPage /> },
    { path:"/login" ,element:<Login /> },
    { path:"/verify-otp" ,element:<VerifyOTP /> },
    { path:"/login/info", element:<PreLoginSteps />},
    { path: "/login/status=pending", element:<PendingVerificationScreen/>},
    // ── Protected routes ───────────────────────
    {element: <ProtectedRoutes/>,   
      children:[ 
      { path: "/home", element : <Home/>},
      { path: "/menu", element : <Menu/>}]
    },
    // ── 404 ───────────────────────────────────
    { path: "*", element: <div>404 Not Found</div> }]
)

  return (
    <>
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
    </>
  );
}

export default App;
