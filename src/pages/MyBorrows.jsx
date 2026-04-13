import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBorrows, saveBorrows, saveBooks, getBooks,
  getHolds, saveHolds,
  getNotifications, saveNotifications,
} from '../utils/storage';
import './MyBorrows.css';

const FINE_PER_DAY = 0.50;

function calcFine(b) {
  if (b.status !== 'borrowed') return 0;
  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(b.dueAt)) / 86400000));
  return overdueDays * FINE_PER_DAY;
}

function daysUntilDue(b) {
  if (!b.dueAt) return null;
  return Math.ceil((new Date(b.dueAt) - Date.now()) / 86400000);
}

function loadUserBorrows(userId) {
  return getBorrows()
    .filter((b) => b.userId === userId)
    .sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

export default function MyBorrows() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState(() => loadUserBorrows(user.id));
  const [holds, setHolds] = useState(() =>
    getHolds().filter((h) => h.userId === user.id)
  );
  const [notifications, setNotifications] = useState(() =>
    getNotifications().filter((n) => n.userId === user.id)
  );
  const [message, setMessage] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null); // borrow object
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [activeTab, setActiveTab] = useState('active');

  function refresh() {
    setBorrows(loadUserBorrows(user.id));
    setHolds(getHolds().filter((h) => h.userId === user.id));
    setNotifications(getNotifications().filter((n) => n.userId === user.id));
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  function handleReturn(borrow) {
    const allBorrows = getBorrows();
    const updated = allBorrows.map((b) =>
      b.id === borrow.id ? { ...b, status: 'returned', returnedAt: new Date().toISOString() } : b
    );
    saveBorrows(updated);

    const books = getBooks();
    saveBooks(books.map((bk) =>
      bk.id === borrow.bookId ? { ...bk, available: bk.available + 1 } : bk
    ));
    setBorrows(loadUserBorrows(user.id));
    showMsg(`"${borrow.bookTitle}" returned successfully.`);
  }

  function handleCancelHold(hold) {
    const all = getHolds();
    saveHolds(all.map((h) =>
      h.id === hold.id ? { ...h, status: 'cancelled' } : h
    ));
    setHolds(getHolds().filter((h) => h.userId === user.id));
    showMsg(`Hold for "${hold.bookTitle}" cancelled.`);
  }

  function dismissNotification(id) {
    const all = getNotifications().map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(all);
    setNotifications(all.filter((n) => n.userId === user.id));
  }

  function openReview(borrow) {
    const book = getBooks().find((b) => b.id === borrow.bookId);
    const existingReview = (book?.reviews || []).find((r) => r.userId === user.id);
    setReviewForm({ rating: existingReview?.rating || 5, text: existingReview?.text || '' });
    setReviewTarget(borrow);
  }

  function handleSubmitReview(e) {
    e.preventDefault();
    const allBooks = getBooks();
    const updated = allBooks.map((b) => {
      if (b.id !== reviewTarget.bookId) return b;
      const reviews = b.reviews || [];
      const existingIdx = reviews.findIndex((r) => r.userId === user.id);
      const newReview = {
        id: existingIdx >= 0 ? reviews[existingIdx].id : crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        rating: reviewForm.rating,
        text: reviewForm.text.trim(),
        createdAt: new Date().toISOString(),
      };
      const updatedReviews = existingIdx >= 0
        ? reviews.map((r, i) => i === existingIdx ? newReview : r)
        : [...reviews, newReview];
      return { ...b, reviews: updatedReviews };
    });
    saveBooks(updated);
    setReviewTarget(null);
    showMsg('Review submitted! Thank you.');
  }

  const active = borrows.filter((b) => b.status === 'borrowed');
  const pending = borrows.filter((b) => b.status === 'pending_approval');
  const history = borrows.filter((b) => b.status === 'returned' || b.status === 'rejected');
  const activeHolds = holds.filter((h) => h.status === 'pending');
  const fulfilledHolds = holds.filter((h) => h.status === 'fulfilled');
  const unreadNotifications = notifications.filter((n) => !n.read);

  // Compute alerts from active borrows
  const alerts = active.map((b) => {
    const days = daysUntilDue(b);
    const fine = calcFine(b);
    if (days !== null && days < 0) {
      return { id: b.id, type: 'overdue', msg: `"${b.bookTitle}" is overdue by ${Math.abs(days)} day(s). Fine: $${fine.toFixed(2)}` };
    }
    if (days !== null && days <= 3) {
      return { id: b.id, type: 'due-soon', msg: `"${b.bookTitle}" is due in ${days} day(s) on ${new Date(b.dueAt).toLocaleDateString()}.` };
    }
    return null;
  }).filter(Boolean);

  const tabs = [
    { key: 'active', label: `Active (${active.length})` },
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'holds', label: `Holds (${activeHolds.length})` },
    { key: 'history', label: `History (${history.length})` },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Borrows</h1>
        <p>Track current borrows, holds, history, and notifications.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Automated alerts */}
      {alerts.map((a) => (
        <div key={a.id} className={`alert-banner alert-banner-${a.type}`}>
          {a.type === 'overdue' ? '🚨' : '⏰'} {a.msg}
        </div>
      ))}

      {/* Unread notifications */}
      {unreadNotifications.length > 0 && (
        <div className="notifications-section">
          <h3>🔔 Notifications</h3>
          {unreadNotifications.map((n) => (
            <div key={n.id} className={`notification-item notif-${n.type}`}>
              <span className="notif-msg">{n.message}</span>
              <span className="notif-time">{new Date(n.createdAt).toLocaleDateString()}</span>
              <button className="notif-dismiss" onClick={() => dismissNotification(n.id)} aria-label="Dismiss">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <div className="modal-overlay" onClick={() => setReviewTarget(null)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Rate &amp; Review</h2>
            <p className="review-book-title">"{reviewTarget.bookTitle}"</p>
            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="star-selector">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`star-btn ${reviewForm.rating >= n ? 'star-active' : ''}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">{reviewForm.rating}/5</span>
                </div>
              </div>
              <div className="form-group">
                <label>Review (optional)</label>
                <textarea
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                  rows={3}
                  maxLength={300}
                  placeholder="Share your thoughts to help other students…"
                />
                <span className="char-count">{reviewForm.text.length}/300</span>
              </div>
              <div className="review-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setReviewTarget(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="tabs-row">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active borrows */}
      {activeTab === 'active' && (
        <section className="borrow-section">
          {active.length === 0 ? (
            <p className="no-borrows">You have no books currently borrowed.</p>
          ) : (
            <div className="borrow-list">
              {active.map((b) => {
                const due = new Date(b.dueAt);
                const days = daysUntilDue(b);
                const overdue = days !== null && days < 0;
                const dueSoon = !overdue && days !== null && days <= 3;
                const fine = calcFine(b);
                return (
                  <div key={b.id} className={`borrow-card ${overdue ? 'overdue' : dueSoon ? 'due-soon' : ''}`}>
                    <div className="borrow-icon">📖</div>
                    <div className="borrow-info">
                      <h3>{b.bookTitle}</h3>
                      <p>Borrowed: {new Date(b.borrowedAt).toLocaleDateString()}</p>
                      <p className={overdue ? 'text-red' : dueSoon ? 'text-orange' : ''}>
                        Due: {due.toLocaleDateString()}
                        {overdue && ` ⚠️ Overdue — Fine: $${fine.toFixed(2)}`}
                        {dueSoon && !overdue && ` ⏰ Due in ${days} day${days !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button className="btn-return" onClick={() => handleReturn(b)}>Return</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Pending borrows */}
      {activeTab === 'pending' && (
        <section className="borrow-section">
          {pending.length === 0 ? (
            <p className="no-borrows">No pending borrow requests.</p>
          ) : (
            <div className="borrow-list">
              {pending.map((b) => (
                <div key={b.id} className="borrow-card pending">
                  <div className="borrow-icon">🕐</div>
                  <div className="borrow-info">
                    <h3>{b.bookTitle}</h3>
                    <p>Requested: {new Date(b.borrowedAt).toLocaleDateString()}</p>
                    <p className="text-blue">Awaiting admin approval…</p>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Holds */}
      {activeTab === 'holds' && (
        <section className="borrow-section">
          {fulfilledHolds.length > 0 && (
            <div className="fulfilled-holds">
              <h3>✅ Ready to Borrow</h3>
              {fulfilledHolds.map((h) => (
                <div key={h.id} className="borrow-card fulfilled-hold">
                  <div className="borrow-icon">📗</div>
                  <div className="borrow-info">
                    <h3>{h.bookTitle}</h3>
                    <p>Fulfilled: {new Date(h.fulfilledAt || h.createdAt).toLocaleDateString()}</p>
                    <p className="text-green">Available now — visit the library to borrow it!</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeHolds.length === 0 ? (
            <p className="no-borrows">You have no active holds. Visit Browse Books to place a hold on an unavailable title.</p>
          ) : (
            <div className="borrow-list">
              {activeHolds.map((h) => (
                <div key={h.id} className="borrow-card hold-card">
                  <div className="borrow-icon">📌</div>
                  <div className="borrow-info">
                    <h3>{h.bookTitle}</h3>
                    <p>Hold placed: {new Date(h.createdAt).toLocaleDateString()}</p>
                    <p className="text-muted">You'll be notified when this becomes available.</p>
                  </div>
                  <button className="btn-cancel-hold" onClick={() => handleCancelHold(h)}>Cancel Hold</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <section className="borrow-section">
          {history.length === 0 ? (
            <p className="no-borrows">No borrow history yet.</p>
          ) : (
            <div className="borrow-list">
              {history.map((b) => (
                <div key={b.id} className={`borrow-card ${b.status === 'returned' ? 'returned' : 'rejected'}`}>
                  <div className="borrow-icon">{b.status === 'returned' ? '✅' : '❌'}</div>
                  <div className="borrow-info">
                    <h3>{b.bookTitle}</h3>
                    <p>Requested: {new Date(b.borrowedAt).toLocaleDateString()}</p>
                    {b.status === 'returned' && b.returnedAt && (
                      <p>Returned: {new Date(b.returnedAt).toLocaleDateString()}</p>
                    )}
                    {b.status === 'rejected' && <p className="text-red">Borrow request was not approved.</p>}
                  </div>
                  <div className="history-actions">
                    <span className={`badge badge-${b.status}`}>{b.status === 'returned' ? 'Returned' : 'Rejected'}</span>
                    {b.status === 'returned' && (
                      <button className="btn-review-link" onClick={() => openReview(b)}>⭐ Review</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
