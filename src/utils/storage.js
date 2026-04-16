// localStorage utilities for data persistence

const KEYS = {
  USERS: 'lms_users',
  BOOKS: 'lms_books',
  BORROWS: 'lms_borrows',
  CURRENT_USER: 'lms_current_user',
  HOLDS: 'lms_holds',
  NOTIFICATIONS: 'lms_notifications',
};

// Hash a password using SHA-256 (Web Crypto API)
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Seed admin and sample data on first load
export async function initStorage() {
  if (!localStorage.getItem(KEYS.USERS)) {
    const adminHash = await hashPassword('admin123');
    const users = [
      {
        id: crypto.randomUUID(),
        name: 'Admin',
        email: 'admin@lms.com',
        passwordHash: adminHash,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  if (!localStorage.getItem(KEYS.BOOKS)) {
    const books = [
      {
        id: crypto.randomUUID(),
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '978-0743273565',
        genre: 'Fiction',
        category: 'Classic',
        type: 'Book',
        year: 1925,
        copies: 3,
        available: 3,
        reviews: [],
        description:
          'A story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '978-0061935466',
        genre: 'Fiction',
        category: 'Classic',
        type: 'Book',
        year: 1960,
        copies: 5,
        available: 5,
        reviews: [],
        description:
          'The story of racial injustice and the loss of innocence in the American South.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'A Brief History of Time',
        author: 'Stephen Hawking',
        isbn: '978-0553380163',
        genre: 'Non-Fiction',
        category: 'Science',
        type: 'Book',
        year: 1988,
        copies: 2,
        available: 2,
        reviews: [],
        description:
          'A landmark volume in science writing about the nature of time and the universe.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: '1984',
        author: 'George Orwell',
        isbn: '978-0451524935',
        genre: 'Fiction',
        category: 'Dystopian',
        type: 'Book',
        year: 1949,
        copies: 4,
        available: 4,
        reviews: [],
        description:
          'A dystopian social science fiction novel set in a totalitarian society.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        isbn: '978-0262033848',
        genre: 'Non-Fiction',
        category: 'Technology',
        type: 'Book',
        year: 2009,
        copies: 3,
        available: 3,
        reviews: [],
        description:
          'A comprehensive textbook covering a broad range of algorithms in depth.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'IEEE Software Engineering Journal — Vol. 39',
        author: 'IEEE Editorial Board',
        isbn: '978-IEEE-SE-039',
        genre: 'Non-Fiction',
        category: 'Technology',
        type: 'Journal',
        year: 2022,
        copies: 2,
        available: 2,
        reviews: [],
        description:
          'Peer-reviewed articles on software engineering practices and emerging technologies.',
        addedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Laboratory Safety Manual',
        author: 'Health & Safety Dept.',
        isbn: '978-LSM-2023-01',
        genre: 'Non-Fiction',
        category: 'Reference',
        type: 'Manual',
        year: 2023,
        copies: 5,
        available: 5,
        reviews: [],
        description:
          'Guidelines and procedures for safe laboratory operations and emergency response.',
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  }

  if (!localStorage.getItem(KEYS.BORROWS)) {
    localStorage.setItem(KEYS.BORROWS, JSON.stringify([]));
  }

  if (!localStorage.getItem(KEYS.HOLDS)) {
    localStorage.setItem(KEYS.HOLDS, JSON.stringify([]));
  }

  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
}

// Users
export function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

// Books
export function getBooks() {
  const books = JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]');
  return books.map((book) => ({
    ...book,
    pdfAccess: book.pdfAccess === 'downloadable' ? 'downloadable' : 'read_only',
  }));
}

export function saveBooks(books) {
  localStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
}

// Borrows
export function getBorrows() {
  return JSON.parse(localStorage.getItem(KEYS.BORROWS) || '[]');
}

export function saveBorrows(borrows) {
  localStorage.setItem(KEYS.BORROWS, JSON.stringify(borrows));
}

// Current user session (password hash is never stored in session)
export function getCurrentUser() {
  const raw = localStorage.getItem(KEYS.CURRENT_USER);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user) {
  if (user) {
    // Strip sensitive fields before persisting the session
    const { passwordHash: _ph, ...safeUser } = user;
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(safeUser));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

// Holds
export function getHolds() {
  return JSON.parse(localStorage.getItem(KEYS.HOLDS) || '[]');
}

export function saveHolds(holds) {
  localStorage.setItem(KEYS.HOLDS, JSON.stringify(holds));
}

// Notifications
export function getNotifications() {
  return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
}

export function saveNotifications(notifications) {
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

export function addNotification({ userId, type, message }) {
  const all = getNotifications();
  all.push({
    id: crypto.randomUUID(),
    userId,
    type,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveNotifications(all);
}

export function markNotificationsRead(userId) {
  const all = getNotifications().map((n) =>
    n.userId === userId ? { ...n, read: true } : n
  );
  saveNotifications(all);
}
