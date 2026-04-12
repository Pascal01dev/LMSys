// localStorage utilities for data persistence

const KEYS = {
  USERS: 'lms_users',
  BOOKS: 'lms_books',
  BORROWS: 'lms_borrows',
  CURRENT_USER: 'lms_current_user',
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
        year: 1925,
        copies: 3,
        available: 3,
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
        year: 1960,
        copies: 5,
        available: 5,
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
        year: 1988,
        copies: 2,
        available: 2,
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
        year: 1949,
        copies: 4,
        available: 4,
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
        year: 2009,
        copies: 3,
        available: 3,
        description:
          'A comprehensive textbook covering a broad range of algorithms in depth.',
        addedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
  }

  if (!localStorage.getItem(KEYS.BORROWS)) {
    localStorage.setItem(KEYS.BORROWS, JSON.stringify([]));
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
  return JSON.parse(localStorage.getItem(KEYS.BOOKS) || '[]');
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
