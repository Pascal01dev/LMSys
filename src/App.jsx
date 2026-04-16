import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initStorage } from './utils/storage';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import BooksPage from './pages/BooksPage';
import MyBorrows from './pages/MyBorrows';
import AdminDashboard from './pages/AdminDashboard';
import AdminBooks from './pages/AdminBooks';
import AdminUsers from './pages/AdminUsers';
import AdminBorrows from './pages/AdminBorrows';
import AdminReports from './pages/AdminReports';

// Seed initial data (async: hashes admin password on first run)
initStorage();

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Remove orphaned Bootstrap backdrops that may block clicks after route changes.
    const hasOpenModal = document.querySelector('.modal.show');
    if (!hasOpenModal) {
      document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    }
  }, [location.pathname]);

  if (user) {
    return (
      <Sidebar>
        <Routes>
          {/* Student routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <BooksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-borrows"
            element={
              <ProtectedRoute>
                <MyBorrows />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/books"
            element={
              <ProtectedRoute adminOnly>
                <AdminBooks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/books/add"
            element={
              <ProtectedRoute adminOnly>
                <AdminBooks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/borrows"
            element={
              <ProtectedRoute adminOnly>
                <AdminBorrows />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute adminOnly>
                <AdminReports />
              </ProtectedRoute>
            }
          />

          {/* Fallback for authenticated users */}
          <Route
            path="*"
            element={
              <Navigate
                to={user.role === 'admin' ? '/admin' : '/dashboard'}
                replace
              />
            }
          />
        </Routes>
      </Sidebar>
    );
  }

  // Public layout — top navbar only
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
