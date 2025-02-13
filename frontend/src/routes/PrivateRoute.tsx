import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute() {
  const loggedInUser = localStorage.getItem("loggedInUser");

  return loggedInUser ? <Outlet /> : <Navigate to="/login" />;
}
