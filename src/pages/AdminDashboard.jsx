import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooks, getUsers, getBorrows } from '../utils/storage';
import './AdminDashboard.css';

function loadStats() {
  const books = getBooks();
  const users = getUsers().filter((u) => u.role === 'student');
  const borrows = getBorrows();
  return {
    books: books.length,
    users: users.length,
    borrows: borrows.filter((b) => b.status === 'borrowed').length,
    returned: borrows.filter((b) => b.status === 'returned').length,
    recentBorrows: [...borrows]
      .sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt))
      .slice(0, 5),
  };
}

export default function AdminDashboard() {
  const [data] = useState(() => loadStats());

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of the Library Management System.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <span className="stat-icon">📚</span>
          <div>
            <div className="stat-value">{data.books}</div>
            <div className="stat-label">Total Books</div>
          </div>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-icon">👥</span>
          <div>
            <div className="stat-value">{data.users}</div>
            <div className="stat-label">Registered Students</div>
          </div>
        </div>
        <div className="stat-card stat-orange">
          <span className="stat-icon">📖</span>
          <div>
            <div className="stat-value">{data.borrows}</div>
            <div className="stat-label">Active Borrows</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-value">{data.returned}</div>
            <div className="stat-label">Returned</div>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-panel">
          <h2>Quick Actions</h2>
          <div className="action-links">
            <Link to="/admin/books/add" className="action-btn action-blue">
              <span>➕</span> Add New Book
            </Link>
            <Link to="/admin/books" className="action-btn action-indigo">
              <span>📚</span> Manage Books
            </Link>
            <Link to="/admin/users" className="action-btn action-green">
              <span>👥</span> Manage Users
            </Link>
            <Link to="/admin/borrows" className="action-btn action-orange">
              <span>📋</span> View Borrows
            </Link>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Recent Borrow Activity</h2>
          {data.recentBorrows.length === 0 ? (
            <p className="no-data">No borrow activity yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBorrows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.bookTitle}</td>
                    <td>{b.userName}</td>
                    <td>{new Date(b.borrowedAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${b.status === 'borrowed' ? 'borrowed' : 'returned'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
