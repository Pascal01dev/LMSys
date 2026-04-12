import { useState } from 'react';
import { getBorrows, saveBorrows, getBooks, saveBooks } from '../utils/storage';
import './AdminBorrows.css';

function loadBorrows() {
  return getBorrows().sort(
    (a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt)
  );
}

export default function AdminBorrows() {
  const [borrows, setBorrows] = useState(() => loadBorrows());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  function refresh() { setBorrows(loadBorrows()); }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleReturn(borrow) {
    if (!window.confirm(`Mark "${borrow.bookTitle}" as returned?`)) return;
    const allBorrows = getBorrows();
    const updated = allBorrows.map((b) =>
      b.id === borrow.id ? { ...b, status: 'returned', returnedAt: new Date().toISOString() } : b
    );
    saveBorrows(updated);

    const books = getBooks();
    saveBooks(books.map((bk) =>
      bk.id === borrow.bookId ? { ...bk, available: bk.available + 1 } : bk
    ));
    showMsg('Book marked as returned.');
    refresh();
  }

  const filtered = borrows.filter((b) => {
    const matchFilter = filter === 'all' || b.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      b.bookTitle.toLowerCase().includes(q) ||
      b.userName.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Borrow Records</h1>
        <p>Monitor all book borrow and return activity.</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="filter-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by book or student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'borrowed', 'returned'].map((f) => (
            <button
              key={f}
              className={`tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="results-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Book</th>
              <th>Student</th>
              <th>Borrowed On</th>
              <th>Due Date</th>
              <th>Returned On</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="8" className="no-data">No records found.</td></tr>
            ) : filtered.map((b, i) => {
              const overdue = b.status === 'borrowed' && new Date(b.dueAt) < new Date();
              return (
                <tr key={b.id} className={overdue ? 'row-overdue' : ''}>
                  <td>{i + 1}</td>
                  <td><strong>{b.bookTitle}</strong></td>
                  <td>{b.userName}</td>
                  <td>{new Date(b.borrowedAt).toLocaleDateString()}</td>
                  <td className={overdue ? 'text-red' : ''}>{new Date(b.dueAt).toLocaleDateString()}</td>
                  <td>{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`badge badge-${b.status === 'borrowed' ? (overdue ? 'overdue' : 'borrowed') : 'returned'}`}>
                      {overdue ? 'Overdue' : b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'borrowed' && (
                      <button className="btn-return" onClick={() => handleReturn(b)}>
                        Mark Returned
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
