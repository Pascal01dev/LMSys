import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const ADMIN_LINKS = [
  { to: '/admin', icon: '🏠', label: 'Dashboard', exact: true },
  { to: '/admin/books', icon: '📚', label: 'Books' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/borrows', icon: '📋', label: 'Borrows' },
];

const STUDENT_LINKS = [
  { to: '/dashboard', icon: '🏠', label: 'Home', exact: true },
  { to: '/books', icon: '📚', label: 'Browse Books' },
  { to: '/my-borrows', icon: '📖', label: 'My Borrows' },
];

export default function Sidebar({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(to, exact) {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  }

  const links = user?.role === 'admin' ? ADMIN_LINKS : STUDENT_LINKS;

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        className="hamburger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">📚</span>
          <span className="sidebar-brand-name">LibraryMS</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {links.map(({ to, icon, label, exact }) => (
            <Link
              key={to}
              to={to}
              className={`sidebar-link${isActive(to, exact) ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-link-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar">
              {user?.name.charAt(0).toUpperCase()}
            </span>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="btn-sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
