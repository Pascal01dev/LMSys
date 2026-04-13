import { useState, useRef } from 'react';
import { getBooks, saveBooks } from '../utils/storage';
import './AdminBooks.css';

const EMPTY_FORM = {
  title: '', author: '', isbn: '', genre: 'Fiction', category: '', type: 'Book', year: '', copies: 1, description: '',
};

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

export default function AdminBooks() {
  const [books, setBooks] = useState(() => getBooks());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  function load() { setBooks(getBooks()); }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPdfFile(null);
    setPdfError('');
    setShowForm(true);
  }

  function openEdit(book) {
    setEditing(book.id);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      category: book.category,
      type: book.type || 'Book',
      year: book.year,
      copies: book.copies,
      description: book.description,
    });
    setPdfFile(null);
    setPdfError('');
    setShowForm(true);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePdfChange(e) {
    const file = e.target.files[0];
    setPdfError('');
    if (!file) { setPdfFile(null); return; }
    if (file.type !== 'application/pdf') {
      setPdfError('Only PDF files are allowed.');
      setPdfFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setPdfError('File is too large (max 5 MB).');
      setPdfFile(null);
      e.target.value = '';
      return;
    }
    setPdfFile(file);
  }

  function persistBook(pdfDataUrl) {
    const all = getBooks();
    if (editing) {
      const updated = all.map((b) => {
        if (b.id !== editing) return b;
        const diff = Number(form.copies) - b.copies;
        return {
          ...b,
          ...form,
          copies: Number(form.copies),
          year: Number(form.year),
          available: Math.max(0, b.available + diff),
          // Keep existing PDF if no new file was selected
          pdfDataUrl: pdfDataUrl !== undefined ? pdfDataUrl : b.pdfDataUrl,
        };
      });
      saveBooks(updated);
      showMsg('Book updated successfully.');
    } else {
      const exists = all.find((b) => b.isbn === form.isbn);
      if (exists) { showMsg('A book with this ISBN already exists.', 'error'); return; }
      const newBook = {
        id: crypto.randomUUID(),
        ...form,
        copies: Number(form.copies),
        year: Number(form.year),
        available: Number(form.copies),
        reviews: [],
        pdfDataUrl: pdfDataUrl || null,
        addedAt: new Date().toISOString(),
      };
      saveBooks([...all, newBook]);
      showMsg('Book added successfully.');
    }
    setShowForm(false);
    load();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (pdfFile) {
      const reader = new FileReader();
      reader.onload = () => persistBook(reader.result);
      reader.readAsDataURL(pdfFile);
    } else {
      // undefined → keep existing PDF (edit); null handled in persistBook for new
      persistBook(undefined);
    }
  }

  function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    saveBooks(getBooks().filter((b) => b.id !== book.id));
    showMsg('Book deleted.');
    load();
  }

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    return (
      !search ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q)
    );
  });

  // Find current book PDF state for the edit form hint
  const editingBook = editing ? books.find((b) => b.id === editing) : null;

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1>Manage Library Resources</h1>
          <p>Add, edit or remove books, journals, manuals and other resources.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Book</button>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editing ? 'Edit Book' : 'Add New Book'}</h2>
            <form onSubmit={handleSubmit} className="book-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input name="title" value={form.title} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Author *</label>
                  <input name="author" value={form.author} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ISBN *</label>
                  <input name="isbn" value={form.isbn} onChange={handleChange} required disabled={!!editing} />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input name="year" type="number" value={form.year} onChange={handleChange} min="1000" max="2100" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Genre *</label>
                  <select name="genre" value={form.genre} onChange={handleChange} required>
                    <option>Fiction</option>
                    <option>Non-Fiction</option>
                    <option>Science</option>
                    <option>History</option>
                    <option>Biography</option>
                    <option>Technology</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Resource Type *</label>
                  <select name="type" value={form.type} onChange={handleChange} required>
                    <option>Book</option>
                    <option>Journal</option>
                    <option>Manual</option>
                    <option>Magazine</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Classic, Science" />
                </div>
                <div className="form-group">
                  <label>Number of Copies *</label>
                  <input name="copies" type="number" min="1" value={form.copies} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
              </div>
              <div className="form-group">
                <label>PDF File (optional, max 5 MB)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  className="pdf-input"
                />
                {pdfError && <span className="pdf-error">{pdfError}</span>}
                {editing && editingBook?.pdfDataUrl && !pdfFile && (
                  <span className="pdf-hint">✅ A PDF is already attached. Upload a new file to replace it.</span>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update Book' : 'Add Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="search-bar-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="results-count">{filtered.length} resource{filtered.length !== 1 ? 's' : ''}</p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Type</th>
              <th>Genre</th>
              <th>Year</th>
              <th>Copies</th>
              <th>Available</th>
              <th>PDF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="11" className="no-data">No resources found.</td></tr>
            ) : filtered.map((book, i) => (
              <tr key={book.id}>
                <td>{i + 1}</td>
                <td><strong>{book.title}</strong></td>
                <td>{book.author}</td>
                <td className="mono">{book.isbn}</td>
                <td><span className="tag tag-type">{book.type || 'Book'}</span></td>
                <td><span className="tag">{book.genre}</span></td>
                <td>{book.year}</td>
                <td>{book.copies}</td>
                <td>
                  <span className={`badge ${book.available > 0 ? 'badge-available' : 'badge-unavailable'}`}>
                    {book.available}
                  </span>
                </td>
                <td>
                  {book.pdfDataUrl ? (
                    <span className="badge badge-pdf">✅ PDF</span>
                  ) : (
                    <span className="badge badge-no-pdf">—</span>
                  )}
                </td>
                <td className="actions-cell">
                  <button className="btn-edit" onClick={() => openEdit(book)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(book)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
