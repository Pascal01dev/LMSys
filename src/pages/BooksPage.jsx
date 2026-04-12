import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBooks,
  getBorrows,
  saveBorrows,
  saveBooks,
} from '../utils/storage';
import './BooksPage.css';

export default function BooksPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState(() => getBooks());
  const [borrows, setBorrows] = useState(() => getBorrows());
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [message, setMessage] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null); // { url, title }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleBorrow(book) {
    const alreadyBorrowed = borrows.find(
      (b) => b.bookId === book.id && b.userId === user.id && b.status === 'borrowed'
    );
    if (alreadyBorrowed) {
      showMsg('You have already borrowed this book.', 'error');
      return;
    }
    if (book.available < 1) {
      showMsg('No copies available right now.', 'error');
      return;
    }

    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 14);

    const newBorrow = {
      id: crypto.randomUUID(),
      bookId: book.id,
      bookTitle: book.title,
      userId: user.id,
      userName: user.name,
      borrowedAt: now.toISOString(),
      dueAt: due.toISOString(),
      status: 'borrowed',
    };

    const updatedBorrows = [...borrows, newBorrow];
    const updatedBooks = books.map((b) =>
      b.id === book.id ? { ...b, available: b.available - 1 } : b
    );

    saveBorrows(updatedBorrows);
    saveBooks(updatedBooks);
    setBorrows(updatedBorrows);
    setBooks(updatedBooks);
    showMsg(`"${book.title}" borrowed successfully! Due in 14 days.`);
  }

  const genres = [...new Set(books.map((b) => b.genre))];
  const categories = [...new Set(books.map((b) => b.category))];

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
    return matchSearch && matchGenre && matchCategory;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Browse Books</h1>
        <p>Search our collection by title, author, ISBN, genre or category.</p>
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

      <div className="search-bar-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by title, author, ISBN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className="btn-clear"
          onClick={() => { setSearch(''); setFilterGenre(''); setFilterCategory(''); }}
        >
          Clear
        </button>
      </div>

      <p className="results-count">{filtered.length} book{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>🔍</span>
          <p>No books match your search. Try different keywords.</p>
        </div>
      ) : (
        <div className="books-list">
          {filtered.map((book) => {
            const borrowed = borrows.find(
              (bw) => bw.bookId === book.id && bw.userId === user.id && bw.status === 'borrowed'
            );
            return (
              <div key={book.id} className="book-row">
                <div className="book-row-cover">
                  <span>📖</span>
                </div>
                <div className="book-row-info">
                  <h3>{book.title}</h3>
                  <p className="author">by {book.author} &nbsp;•&nbsp; {book.year}</p>
                  <p className="meta">
                    <span className="tag">{book.genre}</span>
                    <span className="tag">{book.category}</span>
                    <span className="isbn">ISBN: {book.isbn}</span>
                  </p>
                  <p className="description">{book.description}</p>
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
                  {borrowed ? (
                    <span className="badge badge-borrowed">Borrowed</span>
                  ) : (
                    <button
                      className="btn-borrow"
                      disabled={book.available < 1}
                      onClick={() => handleBorrow(book)}
                    >
                      {book.available < 1 ? 'Unavailable' : 'Borrow'}
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

