import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBooks,
  saveBooks,
  getBorrows,
  saveBorrows,
  getHolds,
  saveHolds,
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
  const [reviewModal, setReviewModal] = useState(null); // { bookId, bookTitle }
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });

  function reload() {
    setBooks(getBooks());
    setBorrows(getBorrows());
    setHolds(getHolds());
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  function handleBorrow(book) {
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

    const newBorrow = {
      id: crypto.randomUUID(),
      bookId: book.id,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
      borrowedAt: new Date().toISOString(),
      dueAt: null,
      status: 'pending_approval',
    };

    const updatedBorrows = [...borrows, newBorrow];
    saveBorrows(updatedBorrows);
    setBorrows(updatedBorrows);
    showMsg(`Borrow request for "${book.title}" submitted. Awaiting admin approval.`);
  }

  function handleHold(book) {
    const existingHold = holds.find(
      (h) => h.bookId === book.id && h.userId === user.id && h.status === 'pending'
    );
    if (existingHold) {
      showMsg('You already have an active hold for this book.', 'error');
      return;
    }

    const newHold = {
      id: crypto.randomUUID(),
      bookId: book.id,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const updatedHolds = [...holds, newHold];
    saveHolds(updatedHolds);
    setHolds(updatedHolds);
    showMsg(`Hold placed for "${book.title}". You'll be notified when it becomes available.`);
  }

  function handleCancelHold(book) {
    const updatedHolds = holds.map((h) =>
      h.bookId === book.id && h.userId === user.id && h.status === 'pending'
        ? { ...h, status: 'cancelled' }
        : h
    );
    saveHolds(updatedHolds);
    setHolds(updatedHolds);
    showMsg(`Hold for "${book.title}" cancelled.`);
  }

  function openReviewModal(book) {
    setReviewModal({ bookId: book.id, bookTitle: book.title });
    setReviewForm({ rating: 5, text: '' });
  }

  function handleSubmitReview(e) {
    e.preventDefault();
    const allBooks = getBooks();
    const updated = allBooks.map((b) => {
      if (b.id !== reviewModal.bookId) return b;
      const reviews = b.reviews || [];
      const existing = reviews.findIndex((r) => r.userId === user.id);
      const newReview = {
        id: existing >= 0 ? reviews[existing].id : crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        rating: reviewForm.rating,
        text: reviewForm.text.trim(),
        createdAt: new Date().toISOString(),
      };
      const updatedReviews = existing >= 0
        ? reviews.map((r, i) => i === existing ? newReview : r)
        : [...reviews, newReview];
      return { ...b, reviews: updatedReviews };
    });
    saveBooks(updated);
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
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* PDF viewer modal */}
      {pdfViewer && (
        <div className="modal-overlay" onClick={() => setPdfViewer(null)}>
          <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h2>📄 {pdfViewer.title}</h2>
              <button className="pdf-modal-close" onClick={() => setPdfViewer(null)}>✕ Close</button>
            </div>
            <embed
              src={pdfViewer.url}
              type="application/pdf"
              className="pdf-embed"
              title={pdfViewer.title}
              aria-label={`PDF document: ${pdfViewer.title}`}
            />
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Rate &amp; Review</h2>
            <p className="review-book-title">"{reviewModal.bookTitle}"</p>
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
                <button type="button" className="btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

