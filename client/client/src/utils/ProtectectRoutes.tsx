import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";
import CheckLoginScreen from "../CheckLoginScreen";

export const ProtectedRoutes = () => {
  const user = useAppSelector((state) => state.auth.restaurant);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const location = useLocation();

  if (isLoading) return <CheckLoginScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};