import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../hooks/redux";
import CheckLoginScreen from "../CheckLoginScreen";

export const PreLoginProtectRoutes: React.FC = () => {
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  if (isLoading) return <CheckLoginScreen />;

  if (restaurant) return <Navigate to="/home" replace />;

  return <Outlet />;
};