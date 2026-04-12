import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBooks, getBorrows } from '../utils/storage';
import './StudentDashboard.css';

function loadDashboard(userId) {
  const books = getBooks();
  const borrows = getBorrows().filter(
    (b) => b.userId === userId && b.status === 'borrowed'
  );
  return {
    stats: {
      total: books.length,
      available: books.filter((b) => b.available > 0).length,
      borrowed: borrows.length,
    },
    recent: books.slice(-4).reverse(),
  };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [{ stats, recent }] = useState(() => loadDashboard(user.id));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.name}! 👋</h1>
        <p>Explore our library collection and manage your borrowed books.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <span className="stat-icon">📚</span>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Books</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Available Now</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <span className="stat-icon">📖</span>
          <div>
            <div className="stat-value">{stats.borrowed}</div>
            <div className="stat-label">My Borrowed</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Recently Added Books</h2>
          <Link to="/books" className="view-all">
            Browse All →
          </Link>
        </div>
        <div className="books-grid">
          {recent.map((book) => (
            <div key={book.id} className="book-card">
              <div className="book-cover">
                <span className="book-cover-icon">📖</span>
              </div>
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">by {book.author}</p>
                <p className="book-genre">{book.genre} • {book.category}</p>
                <div className="book-footer">
                  <span className={`badge ${book.available > 0 ? 'badge-available' : 'badge-unavailable'}`}>
                    {book.available > 0 ? `${book.available} available` : 'Not available'}
                  </span>
                  <Link to="/books" className="btn-sm">View</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-links">
        <Link to="/books" className="quick-link-card">
          <span>🔍</span>
          <strong>Search Books</strong>
          <small>Find books by title, author or genre</small>
        </Link>
        <Link to="/my-borrows" className="quick-link-card">
          <span>📋</span>
          <strong>My Borrows</strong>
          <small>View and return your borrowed books</small>
        </Link>
      </div>
    </div>
  );
}
