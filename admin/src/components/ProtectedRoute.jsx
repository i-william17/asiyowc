import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { token, user } = useSelector((s) => s.auth);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
