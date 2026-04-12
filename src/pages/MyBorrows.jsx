import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBorrows, saveBorrows, saveBooks, getBooks } from '../utils/storage';
import './MyBorrows.css';

function loadUserBorrows(userId) {
  return getBorrows()
    .filter((b) => b.userId === userId)
    .sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

export default function MyBorrows() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState(() => loadUserBorrows(user.id));
  const [message, setMessage] = useState(null);

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleReturn(borrow) {
    const allBorrows = getBorrows();
    const updated = allBorrows.map((b) =>
      b.id === borrow.id ? { ...b, status: 'returned', returnedAt: new Date().toISOString() } : b
    );
    saveBorrows(updated);

    const books = getBooks();
    const updatedBooks = books.map((bk) =>
      bk.id === borrow.bookId ? { ...bk, available: bk.available + 1 } : bk
    );
    saveBooks(updatedBooks);
    setBorrows(loadUserBorrows(user.id));
    showMsg(`"${borrow.bookTitle}" returned successfully.`);
  }

  const active = borrows.filter((b) => b.status === 'borrowed');
  const history = borrows.filter((b) => b.status === 'returned');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Borrows</h1>
        <p>Track your current and past borrowed books.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <section className="borrow-section">
        <h2>Currently Borrowed ({active.length})</h2>
        {active.length === 0 ? (
          <p className="no-borrows">You have no books currently borrowed.</p>
        ) : (
          <div className="borrow-list">
            {active.map((b) => {
              const due = new Date(b.dueAt);
              const overdue = due < new Date();
              return (
                <div key={b.id} className={`borrow-card ${overdue ? 'overdue' : ''}`}>
                  <div className="borrow-icon">📖</div>
                  <div className="borrow-info">
                    <h3>{b.bookTitle}</h3>
                    <p>Borrowed: {new Date(b.borrowedAt).toLocaleDateString()}</p>
                    <p className={overdue ? 'text-red' : ''}>
                      Due: {due.toLocaleDateString()} {overdue ? '⚠️ Overdue' : ''}
                    </p>
                  </div>
                  <button className="btn-return" onClick={() => handleReturn(b)}>
                    Return
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="borrow-section">
          <h2>Borrow History ({history.length})</h2>
          <div className="borrow-list">
            {history.map((b) => (
              <div key={b.id} className="borrow-card returned">
                <div className="borrow-icon">✅</div>
                <div className="borrow-info">
                  <h3>{b.bookTitle}</h3>
                  <p>Borrowed: {new Date(b.borrowedAt).toLocaleDateString()}</p>
                  <p>Returned: {new Date(b.returnedAt).toLocaleDateString()}</p>
                </div>
                <span className="badge badge-returned">Returned</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
