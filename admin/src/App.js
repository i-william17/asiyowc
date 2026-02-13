import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Profile from "./pages/admin/Profile";
import Users from "./pages/admin/Users";
import Groups from "./pages/admin/Groups";
import Programs from "./pages/admin/Programs";

import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "./store/slices/authSlice";
import Loader from "./components/ui/Loader";


function App() {
  const dispatch = useDispatch();
  const { appLoaded } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!appLoaded) {
    return <Loader />
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* 🔥 DEFAULT ROUTE */}
        <Route path="/" element={<Navigate to="/admin/login" />} />

        <Route path="/admin/login" element={<Login />} />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/groups"
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/programs"
          element={
            <ProtectedRoute>
              <Programs />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
