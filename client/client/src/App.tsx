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
import Menus from "./Menus";
import CreateMenu from "./CreateMenu";
import RootLayout from "./utils/RootLayout";
import EditMenu from "./EditMenu";
import Categories from "./Categories";
import CreateCategory from "./CreateCategory";
import EditCategory from "./EditCategory";

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
                    element: <Menus />,
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
              {
                path: "/categories",
                element: <Categories />,
                handle: {
                  primaryHeading: "Categories Management",
                  secondaryHeading: "Organize your menu items into categories",
                  CTA_Button: { label: "+ Add Category", to: "/categories/create" },

                },
              },
              {
                    path: "/categories/create",
                    element: <CreateCategory />,
                    handle: {
                  primaryHeading: "Categories Management",
                  secondaryHeading: "Organize your menu items into categories",
                    },
                  },
                  {
                    path: "categories/:categoryId",
                    element: <EditCategory />,
                    handle: {
                      primaryHeading: "Categories Management",
                      secondaryHeading: "Edit your category details",
                    },
                  }
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