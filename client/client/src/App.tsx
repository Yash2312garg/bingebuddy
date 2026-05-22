import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoutes } from "./utils/ProtectectRoutes";
import { PreLoginProtectRoutes } from "./utils/PreLoginProtectRoutes";
import PostLoginLayouts from "./Layout";
import Login from "./Login";
import VerifyOTP from "./Verify_Otp";
import LandingPage from "./LandingPage";
import PreLoginSteps from "./PreLoginSteps";
import PendingVerificationScreen from "./Verify_Otp/PendingVerific";
import Home from "./Home";
import Menu from "./Menu";
import CreateMenu from "./CreateMenu";
import RootLayout from "./utils/RootLayout";
import EditMenu from "./EditMenu";

const router = createBrowserRouter([
  {
    element: <RootLayout />,          // ✅ initAuth runs once here
    children: [

      // public routes
      {
        element: <PreLoginProtectRoutes />,
        children: [
          { path: "/", element: <LandingPage /> },
          { path: "/login", element: <Login /> },
          { path: "/verify-otp", element: <VerifyOTP /> },
          { path: "/login/info", element: <PreLoginSteps /> },
          { path: "/login/status=pending", element: <PendingVerificationScreen /> },
        ],
      },

      // private routes
      {
        element: <ProtectedRoutes />,
        children: [
          {
            element: <PostLoginLayouts />,
            children: [
              {
                path: "/home",
                element: <Home />,
                handle: {
                  primaryHeading: "Welcome Back!",
                  secondaryHeading: "Here's what's happening with your restaurant today",
                },
              },
              {
                path: "/menu",
                children: [
                  {
                    index: true,
                    element: <Menu />,
                    handle: {
                      primaryHeading: "Menus Management",
                      secondaryHeading: "Create and manage different menus (e.g., Breakfast, Lunch, Dinner)",
                      CTA_Button: { label: "+ Add Menu", to: "/menu/create" },
                    },
                  },
                  {
                    path: "/menu/create",
                    element: <CreateMenu />,
                    handle: {
                      primaryHeading: "Menus Management",
                      secondaryHeading: "Create and manage different menus (e.g., Breakfast, Lunch, Dinner)",
                    },
                  },
                  {
                    path: "edit/:menuId",
                    element: <EditMenu />,
                    handle: {
                      primaryHeading: "Menus Management",
                      secondaryHeading: "Edit your menu details",
                    },
                  }
                ],
              },
            ],
          },
        ],
      },

      { path: "*", element: <div>404 Not Found</div> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;