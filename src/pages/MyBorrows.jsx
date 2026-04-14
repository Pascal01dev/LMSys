import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { borrowsApi, holdsApi, notificationsApi, booksApi } from '../utils/api';
import './MyBorrows.css';

const FINE_PER_DAY = 0.50;

function calcFine(b) {
  if (b.status !== 'borrowed' && b.status !== 'return_pending') return 0;
  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(b.dueAt)) / 86400000));
  return overdueDays * FINE_PER_DAY;
}

function daysUntilDue(b) {
  if (!b.dueAt) return null;
  return Math.ceil((new Date(b.dueAt) - Date.now()) / 86400000);
}




export default function MyBorrows() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState([]);
  const [holds, setHolds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [activeTab, setActiveTab] = useState('active');

  // Initialise on mount
  useEffect(() => {
    (async () => {
      const [b, h, n] = await Promise.all([
        borrowsApi.listByUser(user.id),
        holdsApi.listByUser(user.id),
        notificationsApi.listByUser(user.id),
      ]);
      setBorrows(b.data);
      setHolds(h.data);
      setNotifications(n.data);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    const [b, h, n] = await Promise.all([
      borrowsApi.listByUser(user.id),
      holdsApi.listByUser(user.id),
      notificationsApi.listByUser(user.id),
    ]);
    setBorrows(b.data);
    setHolds(h.data);
    setNotifications(n.data);
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleScheduleReturn(borrow) {
    const result = await Swal.fire({
      title: 'Schedule Return?',
      html: `Schedule the return of <strong>"${borrow.bookTitle}"</strong>?<br/><small class="text-muted">The librarian will confirm once the book is received.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1a237e',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, schedule return',
    });
    if (!result.isConfirmed) return;
    await borrowsApi.scheduleReturn(borrow.id);
    Swal.fire({
      title: 'Return Scheduled!',
      text: 'Your return request has been submitted. The librarian will confirm once the book is received.',
      icon: 'success',
      timer: 2500,
      showConfirmButton: false,
    });
    refresh();
  }

  async function handleCancelHold(hold) {
    await holdsApi.cancel(hold.id);
    refresh();
    showMsg(`Hold for "${hold.bookTitle}" cancelled.`);
  }

  async function dismissNotification(id) {
    await notificationsApi.dismiss(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function openReview(borrow) {
    setReviewForm({ rating: 5, text: '' });
    setReviewTarget(borrow);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    await booksApi.addReview(reviewTarget.bookId, {
      userId: user.id,
      userName: user.name,
      rating: reviewForm.rating,
      text: reviewForm.text.trim(),
    });
    // close Bootstrap modal
    const modalEl = document.getElementById('reviewModal');
    if (modalEl) {
      const bsModal = window.bootstrap?.Modal.getInstance(modalEl);
      bsModal?.hide();
    }
    setReviewTarget(null);
    showMsg('Review submitted! Thank you.');
  }

  const active = borrows.filter((b) => b.status === 'borrowed');
  const returnPending = borrows.filter((b) => b.status === 'return_pending');
  const pending = borrows.filter((b) => b.status === 'pending_approval');
  const history = borrows.filter((b) => b.status === 'returned' || b.status === 'rejected');
  const activeHolds = holds.filter((h) => h.status === 'pending');
  const fulfilledHolds = holds.filter((h) => h.status === 'fulfilled');
  const unreadNotifications = notifications.filter((n) => !n.read);

  const alerts = [...active, ...returnPending].map((b) => {
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
    { key: 'return_pending', label: `Awaiting Confirmation (${returnPending.length})` },
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

      {/* Bootstrap Review Modal */}
      <div className="modal fade" id="reviewModal" tabIndex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="reviewModalLabel">Rate &amp; Review</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            {reviewTarget && (
              <form onSubmit={handleSubmitReview}>
                <div className="modal-body">
                  <p className="review-book-title">"{reviewTarget.bookTitle}"</p>
                  <div className="form-group mb-3">
                    <label className="form-label">Rating</label>
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
                    <label className="form-label">Review (optional)</label>
                    <textarea
                      className="form-control"
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                      rows={3}
                      maxLength={300}
                      placeholder="Share your thoughts to help other students…"
                    />
                    <span className="char-count">{reviewForm.text.length}/300</span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Review</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

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
                    <button className="btn-return" onClick={() => handleScheduleReturn(b)}>
                      📦 Schedule Return
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Return pending — awaiting admin confirmation */}
      {activeTab === 'return_pending' && (
        <section className="borrow-section">
          {returnPending.length === 0 ? (
            <p className="no-borrows">No return requests awaiting confirmation.</p>
          ) : (
            <div className="borrow-list">
              {returnPending.map((b) => (
                <div key={b.id} className="borrow-card pending">
                  <div className="borrow-icon">🔄</div>
                  <div className="borrow-info">
                    <h3>{b.bookTitle}</h3>
                    <p>Return requested: {b.returnRequestedAt ? new Date(b.returnRequestedAt).toLocaleDateString() : '—'}</p>
                    <p className="text-orange">Awaiting librarian confirmation…</p>
                  </div>
                  <span className="badge badge-return-pending">Return Pending</span>
                </div>
              ))}
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
                      <button
                        className="btn-review-link"
                        data-bs-toggle="modal"
                        data-bs-target="#reviewModal"
                        onClick={() => openReview(b)}
                      >
                        ⭐ Review
                      </button>
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
