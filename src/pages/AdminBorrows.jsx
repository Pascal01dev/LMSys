import { useState } from 'react';
import {
  getBorrows, saveBorrows, getBooks, saveBooks,
  getHolds, saveHolds, addNotification,
} from '../utils/storage';
import './AdminBorrows.css';

function loadAll() {
  return getBorrows().sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

const FINE_PER_DAY = 0.50;

function calcFine(b) {
  if (b.status !== 'borrowed') return 0;
  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(b.dueAt)) / 86400000));
  return overdueDays * FINE_PER_DAY;
}

export default function AdminBorrows() {
  const [borrows, setBorrows] = useState(() => loadAll());
  const [holds, setHolds] = useState(() => getHolds());
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  function refresh() {
    setBorrows(loadAll());
    setHolds(getHolds());
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  function handleApprove(borrow) {
    const books = getBooks();
    const book = books.find((bk) => bk.id === borrow.bookId);
    if (!book || book.available < 1) {
      showMsg('No available copies to approve this borrow.', 'error');
      return;
    }

    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 14);

    saveBorrows(getBorrows().map((b) =>
      b.id === borrow.id
        ? { ...b, status: 'borrowed', borrowedAt: now.toISOString(), dueAt: due.toISOString() }
        : b
    ));
    saveBooks(books.map((bk) =>
      bk.id === borrow.bookId ? { ...bk, available: bk.available - 1 } : bk
    ));
    addNotification({
      userId: borrow.userId,
      type: 'borrow_approved',
      message: `Your borrow request for "${borrow.bookTitle}" has been approved. Due in 14 days.`,
    });
    showMsg(`Borrow approved for "${borrow.bookTitle}".`);
    refresh();
  }

  function handleReject(borrow) {
    if (!window.confirm(`Reject borrow request for "${borrow.bookTitle}"?`)) return;
    saveBorrows(getBorrows().map((b) =>
      b.id === borrow.id ? { ...b, status: 'rejected' } : b
    ));
    addNotification({
      userId: borrow.userId,
      type: 'borrow_rejected',
      message: `Your borrow request for "${borrow.bookTitle}" was not approved. Please contact the library for more info.`,
    });
    showMsg(`Borrow request rejected.`);
    refresh();
  }

  function handleReturn(borrow) {
    if (!window.confirm(`Mark "${borrow.bookTitle}" as returned?`)) return;
    const allBorrows = getBorrows();
    saveBorrows(allBorrows.map((b) =>
      b.id === borrow.id ? { ...b, status: 'returned', returnedAt: new Date().toISOString() } : b
    ));

    const books = getBooks();
    saveBooks(books.map((bk) =>
      bk.id === borrow.bookId ? { ...bk, available: bk.available + 1 } : bk
    ));

    // Notify the next person on the hold queue for this book
    const allHolds = getHolds();
    const nextHold = allHolds.find(
      (h) => h.bookId === borrow.bookId && h.status === 'pending'
    );
    if (nextHold) {
      saveHolds(allHolds.map((h) =>
        h.id === nextHold.id ? { ...h, status: 'fulfilled', fulfilledAt: new Date().toISOString() } : h
      ));
      addNotification({
        userId: nextHold.userId,
        type: 'hold_fulfilled',
        message: `"${nextHold.bookTitle}" is now available! Your hold has been fulfilled. Please borrow it within 3 days.`,
      });
    }

    showMsg('Book marked as returned.');
    refresh();
  }

  function handleCancelHold(hold) {
    if (!window.confirm(`Cancel hold for "${hold.bookTitle}" by ${hold.userName}?`)) return;
    saveHolds(getHolds().map((h) =>
      h.id === hold.id ? { ...h, status: 'cancelled' } : h
    ));
    showMsg('Hold cancelled.');
    refresh();
  }

  const now = new Date();

  const pending = borrows.filter((b) => b.status === 'pending_approval');
  const active = borrows.filter((b) => b.status === 'borrowed');
  const overdue = borrows.filter((b) => b.status === 'borrowed' && new Date(b.dueAt) < now);
  const returned = borrows.filter((b) => b.status === 'returned');
  const rejected = borrows.filter((b) => b.status === 'rejected');
  const activeHolds = holds.filter((h) => h.status === 'pending');

  function applySearch(list) {
    const q = search.toLowerCase();
    return !search ? list : list.filter(
      (b) => b.bookTitle.toLowerCase().includes(q) || b.userName.toLowerCase().includes(q)
    );
  }

  const tabs = [
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'borrowed', label: `Active (${active.length})` },
    { key: 'overdue', label: `Overdue (${overdue.length})` },
    { key: 'returned', label: `Returned (${returned.length})` },
    { key: 'rejected', label: `Rejected (${rejected.length})` },
    { key: 'holds', label: `Holds Queue (${activeHolds.length})` },
  ];

  let displayList = [];
  if (activeTab === 'pending') displayList = applySearch(pending);
  else if (activeTab === 'borrowed') displayList = applySearch(active);
  else if (activeTab === 'overdue') displayList = applySearch(overdue);
  else if (activeTab === 'returned') displayList = applySearch(returned);
  else if (activeTab === 'rejected') displayList = applySearch(rejected);
  else if (activeTab === 'holds') displayList = applySearch(activeHolds);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Borrow Records</h1>
        <p>Approve borrow requests, monitor activity, manage holds queue.</p>
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
      </div>

      <div className="filter-tabs" style={{ flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="results-count">{displayList.length} record{displayList.length !== 1 ? 's' : ''}</p>

      {activeTab === 'holds' ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Book</th>
                <th>Student</th>
                <th>Hold Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr><td colSpan="5" className="no-data">No active holds.</td></tr>
              ) : displayList.map((h, i) => (
                <tr key={h.id}>
                  <td>{i + 1}</td>
                  <td><strong>{h.bookTitle}</strong></td>
                  <td>{h.userName}</td>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-reject" onClick={() => handleCancelHold(h)}>Cancel Hold</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Book</th>
                <th>Student</th>
                <th>Requested On</th>
                <th>Due Date</th>
                <th>Returned On</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr><td colSpan="9" className="no-data">No records found.</td></tr>
              ) : displayList.map((b, i) => {
                const isOverdue = b.status === 'borrowed' && new Date(b.dueAt) < now;
                const fine = calcFine(b);
                return (
                  <tr key={b.id} className={isOverdue ? 'row-overdue' : ''}>
                    <td>{i + 1}</td>
                    <td><strong>{b.bookTitle}</strong></td>
                    <td>{b.userName}</td>
                    <td>{new Date(b.borrowedAt).toLocaleDateString()}</td>
                    <td className={isOverdue ? 'text-red' : ''}>
                      {b.dueAt ? new Date(b.dueAt).toLocaleDateString() : '—'}
                    </td>
                    <td>{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '—'}</td>
                    <td className={fine > 0 ? 'text-red' : ''}>
                      {fine > 0 ? `$${fine.toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        b.status === 'pending_approval' ? 'pending' :
                        b.status === 'rejected' ? 'rejected' :
                        b.status === 'borrowed' ? (isOverdue ? 'overdue' : 'borrowed') : 'returned'
                      }`}>
                        {b.status === 'pending_approval' ? 'Pending' :
                         b.status === 'rejected' ? 'Rejected' :
                         isOverdue ? 'Overdue' : b.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {b.status === 'pending_approval' && (
                        <>
                          <button className="btn-approve" onClick={() => handleApprove(b)}>Approve</button>
                          <button className="btn-reject" onClick={() => handleReject(b)}>Reject</button>
                        </>
                      )}
                      {b.status === 'borrowed' && (
                        <button className="btn-return" onClick={() => handleReturn(b)}>Mark Returned</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
