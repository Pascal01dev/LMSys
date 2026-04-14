/**
 * Axios-based API layer.
 *
 * All data operations go through this module.  The functions currently serve
 * data from localStorage so the app works without a real backend, but the
 * interface is intentionally shaped like REST calls (async, returns data
 * payloads) so a backend can be wired in by changing only this file.
 */

import axios from 'axios';
import {
  getBooks, saveBooks,
  getBorrows, saveBorrows,
  getUsers, saveUsers,
  getHolds, saveHolds,
  getNotifications, saveNotifications,
  addNotification,
  hashPassword,
} from './storage';

// ---------------------------------------------------------------------------
// Axios instance (base URL points to the future REST backend)
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token from local storage when present
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('lms_current_user');
  if (raw) {
    try {
      const user = JSON.parse(raw);
      if (user?.id) config.headers['X-User-Id'] = user.id;
    } catch {
      // ignore
    }
  }
  return config;
});

// ---------------------------------------------------------------------------
// Helper – wrap a synchronous localStorage result in a resolved Promise so
// call-sites can use async/await consistently
// ---------------------------------------------------------------------------
function resolve(data) {
  return Promise.resolve({ data });
}

// ---------------------------------------------------------------------------
// Books API
// ---------------------------------------------------------------------------
export const booksApi = {
  list: () => resolve(getBooks()),

  create: (book) => {
    const all = getBooks();
    if (all.find((b) => b.isbn === book.isbn)) {
      return Promise.reject(new Error('A book with this ISBN already exists.'));
    }
    const newBook = {
      id: crypto.randomUUID(),
      ...book,
      copies: Number(book.copies),
      year: Number(book.year),
      available: Number(book.copies),
      reviews: [],
      pdfDataUrl: book.pdfDataUrl || null,
      addedAt: new Date().toISOString(),
    };
    saveBooks([...all, newBook]);
    return resolve(newBook);
  },

  update: (id, patch) => {
    const all = getBooks();
    const updated = all.map((b) => {
      if (b.id !== id) return b;
      const diff = Number(patch.copies) - b.copies;
      return {
        ...b,
        ...patch,
        copies: Number(patch.copies),
        year: Number(patch.year),
        available: Math.max(0, b.available + diff),
        pdfDataUrl: patch.pdfDataUrl !== undefined ? patch.pdfDataUrl : b.pdfDataUrl,
      };
    });
    saveBooks(updated);
    return resolve(updated.find((b) => b.id === id));
  },

  remove: (id) => {
    saveBooks(getBooks().filter((b) => b.id !== id));
    return resolve({ id });
  },

  addReview: (bookId, review) => {
    const all = getBooks();
    const updated = all.map((b) => {
      if (b.id !== bookId) return b;
      const reviews = b.reviews || [];
      const idx = reviews.findIndex((r) => r.userId === review.userId);
      const entry = {
        id: idx >= 0 ? reviews[idx].id : crypto.randomUUID(),
        ...review,
        createdAt: new Date().toISOString(),
      };
      return {
        ...b,
        reviews: idx >= 0 ? reviews.map((r, i) => (i === idx ? entry : r)) : [...reviews, entry],
      };
    });
    saveBooks(updated);
    return resolve(updated.find((b) => b.id === bookId));
  },
};

// ---------------------------------------------------------------------------
// Borrows API
// ---------------------------------------------------------------------------
export const borrowsApi = {
  list: () => resolve(getBorrows()),

  listByUser: (userId) =>
    resolve(
      getBorrows()
        .filter((b) => b.userId === userId)
        .sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt))
    ),

  create: (borrow) => {
    const newBorrow = {
      id: crypto.randomUUID(),
      ...borrow,
      borrowedAt: new Date().toISOString(),
      dueAt: null,
      status: 'pending_approval',
    };
    saveBorrows([...getBorrows(), newBorrow]);
    return resolve(newBorrow);
  },

  approve: (id) => {
    const all = getBorrows();
    const borrow = all.find((b) => b.id === id);
    if (!borrow) return Promise.reject(new Error('Borrow not found.'));

    const books = getBooks();
    const book = books.find((bk) => bk.id === borrow.bookId);
    if (!book || book.available < 1) {
      return Promise.reject(new Error('No available copies to approve this borrow.'));
    }

    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 14);

    const updated = { ...borrow, status: 'borrowed', borrowedAt: now.toISOString(), dueAt: due.toISOString() };
    saveBorrows(all.map((b) => (b.id === id ? updated : b)));
    saveBooks(books.map((bk) => (bk.id === borrow.bookId ? { ...bk, available: bk.available - 1 } : bk)));
    addNotification({
      userId: borrow.userId,
      type: 'borrow_approved',
      message: `Your borrow request for "${borrow.bookTitle}" has been approved. Due in 14 days.`,
    });
    return resolve(updated);
  },

  reject: (id) => {
    const all = getBorrows();
    const borrow = all.find((b) => b.id === id);
    if (!borrow) return Promise.reject(new Error('Borrow not found.'));
    const updated = { ...borrow, status: 'rejected' };
    saveBorrows(all.map((b) => (b.id === id ? updated : b)));
    addNotification({
      userId: borrow.userId,
      type: 'borrow_rejected',
      message: `Your borrow request for "${borrow.bookTitle}" was not approved. Please contact the library for more info.`,
    });
    return resolve(updated);
  },

  /** Student schedules a return – sets status to return_pending */
  scheduleReturn: (id) => {
    const all = getBorrows();
    const borrow = all.find((b) => b.id === id);
    if (!borrow) return Promise.reject(new Error('Borrow not found.'));
    const updated = { ...borrow, status: 'return_pending', returnRequestedAt: new Date().toISOString() };
    saveBorrows(all.map((b) => (b.id === id ? updated : b)));
    return resolve(updated);
  },

  /** Admin confirms a student's return request */
  confirmReturn: (id) => {
    const all = getBorrows();
    const borrow = all.find((b) => b.id === id);
    if (!borrow) return Promise.reject(new Error('Borrow not found.'));
    const updated = { ...borrow, status: 'returned', returnedAt: new Date().toISOString() };
    saveBorrows(all.map((b) => (b.id === id ? updated : b)));

    const books = getBooks();
    saveBooks(books.map((bk) => (bk.id === borrow.bookId ? { ...bk, available: bk.available + 1 } : bk)));

    // Fulfil the next hold in queue
    const allHolds = getHolds();
    const nextHold = allHolds.find((h) => h.bookId === borrow.bookId && h.status === 'pending');
    if (nextHold) {
      saveHolds(
        allHolds.map((h) =>
          h.id === nextHold.id ? { ...h, status: 'fulfilled', fulfilledAt: new Date().toISOString() } : h
        )
      );
      addNotification({
        userId: nextHold.userId,
        type: 'hold_fulfilled',
        message: `"${nextHold.bookTitle}" is now available! Your hold has been fulfilled. Please borrow it within 3 days.`,
      });
    }

    addNotification({
      userId: borrow.userId,
      type: 'return_confirmed',
      message: `Your return of "${borrow.bookTitle}" has been confirmed. Thank you!`,
    });
    return resolve(updated);
  },

  /** Admin rejects a return request – book goes back to 'borrowed' */
  rejectReturn: (id) => {
    const all = getBorrows();
    const borrow = all.find((b) => b.id === id);
    if (!borrow) return Promise.reject(new Error('Borrow not found.'));
    const updated = { ...borrow, status: 'borrowed', returnRequestedAt: null };
    saveBorrows(all.map((b) => (b.id === id ? updated : b)));
    addNotification({
      userId: borrow.userId,
      type: 'return_rejected',
      message: `Your return request for "${borrow.bookTitle}" was not confirmed. Please contact the library.`,
    });
    return resolve(updated);
  },
};

// ---------------------------------------------------------------------------
// Holds API
// ---------------------------------------------------------------------------
export const holdsApi = {
  listByUser: (userId) => resolve(getHolds().filter((h) => h.userId === userId)),

  list: () => resolve(getHolds()),

  create: (hold) => {
    const all = getHolds();
    const newHold = {
      id: crypto.randomUUID(),
      ...hold,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    saveHolds([...all, newHold]);
    return resolve(newHold);
  },

  cancel: (id) => {
    const all = getHolds();
    const updated = all.map((h) => (h.id === id ? { ...h, status: 'cancelled' } : h));
    saveHolds(updated);
    return resolve({ id });
  },
};

// ---------------------------------------------------------------------------
// Users / Auth API
// ---------------------------------------------------------------------------
export const usersApi = {
  list: () => resolve(getUsers()),

  create: async (userData) => {
    const all = getUsers();
    if (all.find((u) => u.email === userData.email)) {
      return Promise.reject(new Error('Email already registered.'));
    }
    const passwordHash = await hashPassword(userData.password);
    const newUser = {
      id: crypto.randomUUID(),
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: 'student',
      status: 'active',
      studentId: userData.studentId || '',
      phone: userData.phone || '',
      createdAt: new Date().toISOString(),
    };
    saveUsers([...all, newUser]);
    return resolve(newUser);
  },

  update: async (id, patch) => {
    const all = getUsers();
    const updated = await Promise.all(
      all.map(async (u) => {
        if (u.id !== id) return u;
        const base = { ...u, ...patch };
        if (patch.password) base.passwordHash = await hashPassword(patch.password);
        delete base.password;
        return base;
      })
    );
    saveUsers(updated);
    return resolve(updated.find((u) => u.id === id));
  },

  setStatus: (id, status) => {
    const all = getUsers().map((u) => (u.id === id ? { ...u, status } : u));
    saveUsers(all);
    return resolve({ id, status });
  },

  remove: (id) => {
    saveUsers(getUsers().filter((u) => u.id !== id));
    return resolve({ id });
  },
};

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------
export const notificationsApi = {
  listByUser: (userId) => resolve(getNotifications().filter((n) => n.userId === userId)),

  dismiss: (id) => {
    const all = getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(all);
    return resolve({ id });
  },
};
