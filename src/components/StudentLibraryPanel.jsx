import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'bootstrap';
import { borrowsApi, holdsApi } from '../utils/api';
import { getBooks, getBorrows, getHolds } from '../utils/storage';
import '../pages/BooksPage.css';

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

function fileNameFromTitle(title) {
  const safe = (title || 'resource')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${safe || 'resource'}.pdf`;
}

export default function StudentLibraryPanel({ userId, userName, onActivityChange }) {
  const [books, setBooks] = useState(() => getBooks());
  const [borrows, setBorrows] = useState(() => getBorrows());
  const [holds, setHolds] = useState(() => getHolds());
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [message, setMessage] = useState(null);
  const [pdfViewer, setPdfViewer] = useState(null);
  const pdfModalRef = useRef(null);

  function reloadAll() {
    setBooks(getBooks());
    setBorrows(getBorrows());
    setHolds(getHolds());
    onActivityChange?.();
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  useEffect(() => {
    if (!pdfModalRef.current) return;
    const bsModal = Modal.getOrCreateInstance(pdfModalRef.current);
    if (pdfViewer) {
      bsModal.show();
    } else {
      bsModal.hide();
    }
  }, [pdfViewer]);

  useEffect(() => {
    const el = pdfModalRef.current;
    if (!el) return;
    const handler = () => setPdfViewer(null);
    el.addEventListener('hidden.bs.modal', handler);
    return () => el.removeEventListener('hidden.bs.modal', handler);
  }, []);

  async function handleBorrow(book) {
    const alreadyActive = borrows.find(
      (b) => b.bookId === book.id && b.userId === userId &&
        (b.status === 'borrowed' || b.status === 'pending_approval')
    );
    if (alreadyActive) {
      showMsg('You already have an active or pending borrow for this resource.', 'error');
      return;
    }
    if (book.available < 1) {
      showMsg('No copies available right now.', 'error');
      return;
    }
    await borrowsApi.create({
      bookId: book.id,
      bookTitle: book.title,
      userId,
      userName,
    });
    reloadAll();
    showMsg(`Borrow request for "${book.title}" submitted. Awaiting admin approval.`);
  }

  async function handleHold(book) {
    const existingHold = holds.find(
      (h) => h.bookId === book.id && h.userId === userId && h.status === 'pending'
    );
    if (existingHold) {
      showMsg('You already have an active hold for this resource.', 'error');
      return;
    }
    await holdsApi.create({
      bookId: book.id,
      bookTitle: book.title,
      userId,
      userName,
    });
    reloadAll();
    showMsg(`Hold placed for "${book.title}".`);
  }

  async function handleCancelHold(book) {
    const hold = holds.find(
      (h) => h.bookId === book.id && h.userId === userId && h.status === 'pending'
    );
    if (!hold) return;
    await holdsApi.cancel(hold.id);
    reloadAll();
    showMsg(`Hold for "${book.title}" cancelled.`);
  }

  const genres = useMemo(() => [...new Set(books.map((b) => b.genre))], [books]);
  const categories = useMemo(() => [...new Set(books.map((b) => b.category))], [books]);
  const types = useMemo(() => [...new Set(books.map((b) => b.type || 'Book'))], [books]);

  const filtered = useMemo(() => books.filter((b) => {
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
  }), [books, search, filterGenre, filterCategory, filterType]);

  return (
    <div className="section">
      <div className="section-header">
        <h2>Resource Center</h2>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="modal fade" id="homePdfViewerModal" tabIndex="-1" aria-labelledby="homePdfViewerModalLabel" aria-hidden="true" ref={pdfModalRef}>
        <div className="modal-dialog modal-a4 modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="homePdfViewerModalLabel">📄 {pdfViewer?.title}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-0" onContextMenu={(e) => e.preventDefault()}>
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
              (bw) => bw.bookId === book.id && bw.userId === userId &&
                (bw.status === 'borrowed' || bw.status === 'pending_approval')
            );
            const myHold = holds.find(
              (h) => h.bookId === book.id && h.userId === userId && h.status === 'pending'
            );
            const isDownloadable = book.pdfAccess === 'downloadable';

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
                      📄 Read Online
                    </button>
                  )}

                  {book.pdfDataUrl && isDownloadable && (
                    <a
                      className="btn-download-pdf"
                      href={book.pdfDataUrl}
                      download={fileNameFromTitle(book.title)}
                    >
                      ⬇ Download PDF
                    </a>
                  )}

                  {book.pdfDataUrl && !isDownloadable && (
                    <span className="badge badge-pending">Read Only PDF</span>
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
