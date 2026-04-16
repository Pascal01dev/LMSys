import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { booksApi, borrowsApi, holdsApi } from '../utils/api';
import {
  getBooks,
  getBorrows,
  getHolds,
  getNotifications,
  markNotificationsRead,
} from '../utils/storage';
import './BooksPage.css';

function avgRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}

function StarRating({ rating }) {
  if (rating === null) return <span className="no-rating">No ratings yet</span>;
  const stars = Math.round(parseFloat(rating));
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span className="rating-num"> {rating}</span>
    </span>
  );
}

function getReadOnlyPdfUrl(url) {
  if (!url) return url;
  const [baseUrl, hashFragment = ''] = url.split('#');
  const existingHash = hashFragment.trim();
  const readOnlyParams = 'toolbar=0&navpanes=0&scrollbar=1';
  if (!existingHash) return `${baseUrl}#${readOnlyParams}`;
  const existingPdfParams = existingHash.includes('=') || existingHash.includes('&')
    ? existingHash
    : `nameddest=${encodeURIComponent(existingHash)}`;
  return `${baseUrl}#${readOnlyParams}&${existingPdfParams}`;
}

export default function BooksPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState(() => getBooks());
  const [borrows, setBorrows] = useState(() => getBorrows());
  const [holds, setHolds] = useState(() => getHolds());
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [message, setMessage] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const pdfModalRef = useRef(null);
  const reviewModalRef = useRef(null);

  function reload() {
    setBooks(getBooks());
    setBorrows(getBorrows());
    setHolds(getHolds());
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  // PDF modal sync
  useEffect(() => {
    if (!pdfModalRef.current) return;
    const bsModal = window.bootstrap?.Modal.getOrCreateInstance(pdfModalRef.current);
    if (pdfViewer) {
      bsModal?.show();
    } else {
      bsModal?.hide();
    }
  }, [pdfViewer]);

  useEffect(() => {
    const el = pdfModalRef.current;
    if (!el) return;
    const handler = () => setPdfViewer(null);
    el.addEventListener('hidden.bs.modal', handler);
    return () => el.removeEventListener('hidden.bs.modal', handler);
  }, []);

  // Review modal sync
  useEffect(() => {
    if (!reviewModalRef.current) return;
    const bsModal = window.bootstrap?.Modal.getOrCreateInstance(reviewModalRef.current);
    if (reviewModal) {
      bsModal?.show();
    } else {
      bsModal?.hide();
    }
  }, [reviewModal]);

  useEffect(() => {
    const el = reviewModalRef.current;
    if (!el) return;
    const handler = () => setReviewModal(null);
    el.addEventListener('hidden.bs.modal', handler);
    return () => el.removeEventListener('hidden.bs.modal', handler);
  }, []);

  async function handleBorrow(book) {
    const alreadyActive = borrows.find(
      (b) => b.bookId === book.id && b.userId === user.id &&
        (b.status === 'borrowed' || b.status === 'pending_approval')
    );
    if (alreadyActive) {
      showMsg('You already have an active or pending borrow for this book.', 'error');
      return;
    }
    if (book.available < 1) {
      showMsg('No copies available right now.', 'error');
      return;
    }
    const { data: newBorrow } = await borrowsApi.create({
      bookId: book.id,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
    });
    setBorrows((prev) => [...prev, newBorrow]);
    showMsg(`Borrow request for "${book.title}" submitted. Awaiting admin approval.`);
  }

  async function handleHold(book) {
    const existingHold = holds.find(
      (h) => h.bookId === book.id && h.userId === user.id && h.status === 'pending'
    );
    if (existingHold) {
      showMsg('You already have an active hold for this book.', 'error');
      return;
    }
    const { data: newHold } = await holdsApi.create({
      bookId: book.id,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
    });
    setHolds((prev) => [...prev, newHold]);
    showMsg(`Hold placed for "${book.title}". You'll be notified when it becomes available.`);
  }

  async function handleCancelHold(book) {
    const hold = holds.find(
      (h) => h.bookId === book.id && h.userId === user.id && h.status === 'pending'
    );
    if (!hold) return;
    await holdsApi.cancel(hold.id);
    reload();
    showMsg(`Hold for "${book.title}" cancelled.`);
  }

  function openReviewModal(book) {
    setReviewModal({ bookId: book.id, bookTitle: book.title });
    setReviewForm({ rating: 5, text: '' });
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    await booksApi.addReview(reviewModal.bookId, {
      userId: user.id,
      userName: user.name,
      rating: reviewForm.rating,
      text: reviewForm.text.trim(),
    });
    setReviewModal(null);
    reload();
    showMsg('Review submitted!');
  }

  // Dismiss hold_fulfilled notifications on mount only
  useEffect(() => {
    const unread = getNotifications().filter(
      (n) => n.userId === user.id && !n.read && n.type === 'hold_fulfilled'
    );
    if (unread.length > 0) markNotificationsRead(user.id);
  }, [user.id]);

  const genres = [...new Set(books.map((b) => b.genre))];
  const categories = [...new Set(books.map((b) => b.category))];
  const types = [...new Set(books.map((b) => b.type || 'Book'))];

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q);
    const matchGenre = !filterGenre || b.genre === filterGenre;
    const matchCategory = !filterCategory || b.category === filterCategory;
    const matchType = !filterType || (b.type || 'Book') === filterType;
    return matchSearch && matchGenre && matchCategory && matchType;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Browse Library Resources</h1>
        <p>Search books, journals, manuals and more by title, author, genre or type.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {/* Bootstrap PDF viewer modal */}
      <div className="modal fade" id="pdfViewerModal" tabIndex="-1" aria-labelledby="pdfViewerModalLabel" aria-hidden="true" ref={pdfModalRef}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="pdfViewerModalLabel">📄 {pdfViewer?.title}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-0" style={{ minHeight: '70vh' }}>
              {pdfViewer && (
                <embed
                  src={getReadOnlyPdfUrl(pdfViewer.url)}
                  type="application/pdf"
                  className="pdf-embed"
                  title={pdfViewer.title}
                  aria-label={`PDF document: ${pdfViewer.title}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap Review modal */}
      <div className="modal fade" id="reviewModal" tabIndex="-1" aria-labelledby="reviewModalLabel" aria-hidden="true" ref={reviewModalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="reviewModalLabel">Rate &amp; Review</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            {reviewModal && (
              <form onSubmit={handleSubmitReview}>
                <div className="modal-body">
                  <p className="review-book-title">"{reviewModal.bookTitle}"</p>
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

      <div className="search-bar-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by title, author, ISBN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
          <option value="">All Genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          className="btn-clear"
          onClick={() => { setSearch(''); setFilterGenre(''); setFilterCategory(''); setFilterType(''); }}
        >
          Clear
        </button>
      </div>

      <p className="results-count">{filtered.length} resource{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>🔍</span>
          <p>No resources match your search. Try different keywords.</p>
        </div>
      ) : (
        <div className="books-list">
          {filtered.map((book) => {
            const activeBorrow = borrows.find(
              (bw) => bw.bookId === book.id && bw.userId === user.id &&
                (bw.status === 'borrowed' || bw.status === 'pending_approval')
            );
            const myHold = holds.find(
              (h) => h.bookId === book.id && h.userId === user.id && h.status === 'pending'
            );
            const avg = avgRating(book.reviews);
            const myReview = (book.reviews || []).find((r) => r.userId === user.id);
            return (
              <div key={book.id} className="book-row">
                <div className="book-row-cover">
                  <span>📖</span>
                </div>
                <div className="book-row-info">
                  <h3>{book.title}</h3>
                  <p className="author">by {book.author} &nbsp;•&nbsp; {book.year}</p>
                  <p className="meta">
                    <span className="tag tag-type">{book.type || 'Book'}</span>
                    <span className="tag">{book.genre}</span>
                    <span className="tag">{book.category}</span>
                    <span className="isbn">ISBN: {book.isbn}</span>
                  </p>
                  <p className="description">{book.description}</p>
                  <div className="rating-row">
                    <StarRating rating={avg} />
                    {book.reviews && book.reviews.length > 0 && (
                      <span className="review-count">({book.reviews.length} review{book.reviews.length !== 1 ? 's' : ''})</span>
                    )}
                    <button className="btn-review-link" onClick={() => openReviewModal(book)}>
                      {myReview ? '✏️ Edit Review' : '⭐ Leave Review'}
                    </button>
                  </div>
                  {/* Recent reviews */}
                  {book.reviews && book.reviews.length > 0 && (
                    <div className="reviews-preview">
                      {book.reviews.slice(-2).map((r) => (
                        <div key={r.id} className="review-item">
                          <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          <span className="review-user">{r.userName}</span>
                          {r.text && <span className="review-text">— {r.text}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="book-row-action">
                  <span className={`badge ${book.available > 0 ? 'badge-available' : 'badge-unavailable'}`}>
                    {book.available}/{book.copies} available
                  </span>
                  {book.pdfDataUrl && (
                    <button
                      className="btn-read-pdf"
                      aria-label={`Read PDF for ${book.title}`}
                      onClick={() => setPdfViewer({ url: book.pdfDataUrl, title: book.title })}
                    >
                      📄 Read PDF
                    </button>
                  )}
                  {activeBorrow ? (
                    <span className={`badge ${activeBorrow.status === 'pending_approval' ? 'badge-pending' : 'badge-borrowed'}`}>
                      {activeBorrow.status === 'pending_approval' ? 'Pending Approval' : 'Borrowed'}
                    </span>
                  ) : book.available < 1 ? (
                    myHold ? (
                      <button className="btn-cancel-hold" onClick={() => handleCancelHold(book)}>
                        📌 Cancel Hold
                      </button>
                    ) : (
                      <button className="btn-hold" onClick={() => handleHold(book)}>
                        📌 Place Hold
                      </button>
                    )
                  ) : (
                    <button className="btn-borrow" onClick={() => handleBorrow(book)}>
                      Borrow
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
