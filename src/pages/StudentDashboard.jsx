import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBooks, getBorrows, getNotifications, saveNotifications, getHolds,
} from '../utils/storage';
import './StudentDashboard.css';

function loadDashboard(userId) {
  const books = getBooks();
  const borrows = getBorrows().filter((b) => b.userId === userId);
  const activeBorrows = borrows.filter((b) => b.status === 'borrowed');
  const holds = getHolds().filter((h) => h.userId === userId && h.status === 'pending');
  const notifications = getNotifications().filter((n) => n.userId === userId && !n.read);

  // Detect overdue and due-soon alerts
  const now = Date.now();
  const alerts = activeBorrows.map((b) => {
    const days = Math.ceil((new Date(b.dueAt) - now) / 86400000);
    if (days < 0) return { type: 'overdue', msg: `"${b.bookTitle}" is overdue by ${Math.abs(days)} day(s).` };
    if (days <= 3) return { type: 'due-soon', msg: `"${b.bookTitle}" is due in ${days} day(s).` };
    return null;
  }).filter(Boolean);

  // Detect favorite genres from borrow history
  const genreCount = {};
  borrows.forEach((b) => {
    const book = books.find((bk) => bk.id === b.bookId);
    if (book) genreCount[book.genre] = (genreCount[book.genre] || 0) + 1;
  });
  const favoriteGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  // New arrivals (last 7 days) in favorite genres
  const sevenDaysAgo = new Date(now - 7 * 86400000);
  const newArrivals = books.filter(
    (b) =>
      new Date(b.addedAt) > sevenDaysAgo &&
      (favoriteGenres.length === 0 || favoriteGenres.includes(b.genre))
  ).slice(0, 4);

  return {
    stats: {
      total: books.length,
      available: books.filter((b) => b.available > 0).length,
      borrowed: activeBorrows.length,
      pending: borrows.filter((b) => b.status === 'pending_approval').length,
    },
    recent: books.slice(-4).reverse(),
    alerts,
    notifications,
    holds: holds.length,
    newArrivals,
    favoriteGenres,
  };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(() => loadDashboard(user.id));

  function dismissNotification(id) {
    const all = getNotifications().map((n) => n.id === id ? { ...n, read: true } : n);
    saveNotifications(all);
    setData(loadDashboard(user.id));
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.name}! 👋</h1>
        <p>Explore our library collection and manage your borrowed books.</p>
      </div>

      {/* Automated alerts */}
      {data.alerts.map((a, i) => (
        <div key={i} className={`dash-alert dash-alert-${a.type}`}>
          {a.type === 'overdue' ? '🚨' : '⏰'} {a.msg}
          {' '}<Link to="/my-borrows" className="dash-alert-link">View →</Link>
        </div>
      ))}

      {/* Unread notifications */}
      {data.notifications.length > 0 && (
        <div className="dash-notifications">
          <h3>🔔 Notifications ({data.notifications.length})</h3>
          {data.notifications.map((n) => (
            <div key={n.id} className={`notif-item notif-${n.type}`}>
              <span className="notif-msg">{n.message}</span>
              <button className="notif-dismiss" onClick={() => dismissNotification(n.id)} aria-label="Dismiss">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <span className="stat-icon">📚</span>
          <div>
            <div className="stat-value">{data.stats.total}</div>
            <div className="stat-label">Total Resources</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-value">{data.stats.available}</div>
            <div className="stat-label">Available Now</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <span className="stat-icon">📖</span>
          <div>
            <div className="stat-value">{data.stats.borrowed}</div>
            <div className="stat-label">My Borrowed</div>
          </div>
        </div>
        <div className="stat-card stat-yellow">
          <span className="stat-icon">🕐</span>
          <div>
            <div className="stat-value">{data.stats.pending}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <span className="stat-icon">📌</span>
          <div>
            <div className="stat-value">{data.holds}</div>
            <div className="stat-label">Active Holds</div>
          </div>
        </div>
      </div>

      {/* New arrivals */}
      {data.newArrivals.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>
              🆕 New Arrivals
              {data.favoriteGenres.length > 0 && (
                <span className="section-sub"> — {data.favoriteGenres.join(', ')}</span>
              )}
            </h2>
            <Link to="/books" className="view-all">Browse All →</Link>
          </div>
          <div className="books-grid">
            {data.newArrivals.map((book) => (
              <div key={book.id} className="book-card">
                <div className="book-cover">
                  <span className="book-cover-icon">📖</span>
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">by {book.author}</p>
                  <p className="book-genre">{book.genre} • {book.type || 'Book'}</p>
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
      )}

      <div className="section">
        <div className="section-header">
          <h2>Recently Added</h2>
          <Link to="/books" className="view-all">Browse All →</Link>
        </div>
        <div className="books-grid">
          {data.recent.map((book) => (
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
          <strong>Search Resources</strong>
          <small>Find books, journals and manuals</small>
        </Link>
        <Link to="/my-borrows" className="quick-link-card">
          <span>📋</span>
          <strong>My Borrows</strong>
          <small>View borrows, holds and history</small>
        </Link>
        <Link to="/my-borrows" className="quick-link-card">
          <span>📌</span>
          <strong>My Holds</strong>
          <small>Manage your reservation queue</small>
        </Link>
      </div>
    </div>
  );
}
