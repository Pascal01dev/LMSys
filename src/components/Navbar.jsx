import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'}>
           <span className="brand-icon"><img src="src/assets/Logo.png" alt="" /></span>
        </Link>
      </div>

      <div className="navbar-links">
        {user ? (
          <>
            {user.role === 'admin' ? (
              <>
                <Link to="/admin">Dashboard</Link>
                <Link to="/admin/books">Books</Link>
                <Link to="/admin/users">Users</Link>
                <Link to="/admin/borrows">Borrows</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard">Home</Link>
                <Link to="/books">Browse Books</Link>
                <Link to="/my-borrows">My Borrows</Link>
              </>
            )}
            <div className="navbar-user">
              <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span className="user-name">{user.name}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-register">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
