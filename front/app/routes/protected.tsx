import { Outlet, Navigate, useLocation } from "react-router";
import { useAuth } from "~/context/AuthContext";

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
