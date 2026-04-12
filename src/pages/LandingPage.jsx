import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="hero">
        <div className="hero-content">
          <span className="hero-icon">📚</span>
          <h1>Library Management System</h1>
          <p>
            Discover, borrow and manage books seamlessly. Students can search
            our entire collection and borrow books, while admins can manage
            resources and users.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="btn-hero-primary">Sign In</Link>
            <Link to="/register" className="btn-hero-secondary">Register</Link>
          </div>
        </div>
        <div className="hero-art">
          <div className="book-stack">
            <div className="book-item book-1">📗</div>
            <div className="book-item book-2">📘</div>
            <div className="book-item book-3">📕</div>
            <div className="book-item book-4">📙</div>
          </div>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <span>🔍</span>
          <h3>Smart Search</h3>
          <p>Search books by title, author, ISBN, genre or category instantly.</p>
        </div>
        <div className="feature-card">
          <span>📖</span>
          <h3>Easy Borrowing</h3>
          <p>Borrow and return books with a single click. Track due dates.</p>
        </div>
        <div className="feature-card">
          <span>🛠️</span>
          <h3>Admin Control</h3>
          <p>Admins can add books, manage inventory and oversee all users.</p>
        </div>
        <div className="feature-card">
          <span>👥</span>
          <h3>User Management</h3>
          <p>Students register themselves; admins have full oversight of accounts.</p>
        </div>
      </div>
    </div>
  );
}
