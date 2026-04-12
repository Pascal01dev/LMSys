# 📚 Library Management System (LMSys)

A React-based Library Management System that allows students to search, browse, and borrow books, while administrators can manage the library's book inventory and user accounts.

## Features

### Student
- Register and log in to their account
- Browse the full book catalog
- Search books by **title**, **author**, **ISBN**, **genre**, or **category**
- Filter by genre or category
- Borrow available books (14-day loan period)
- Return borrowed books
- View borrow history

### Admin
- Pre-seeded admin account (no registration required)
- Dashboard with key statistics
- Add, edit, and delete books
- Manage user accounts (view and remove students)
- Monitor all borrow records (with overdue detection)
- Mark books as returned on behalf of students

## Tech Stack

- **React 19** + **Vite**
- **React Router v7** for client-side routing
- **localStorage** for data persistence (no backend required)
- Plain **CSS** for styling

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Demo Credentials

| Role  | Email            | Password   |
|-------|------------------|------------|
| Admin | admin@lms.com    | admin123   |
| Student | Register a new account |  |

## Project Structure

```
src/
├── context/         # AuthContext (login, register, logout)
├── components/      # Shared components (Navbar, ProtectedRoute)
├── pages/           # All page components
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── StudentDashboard.jsx
│   ├── BooksPage.jsx
│   ├── MyBorrows.jsx
│   ├── AdminDashboard.jsx
│   ├── AdminBooks.jsx
│   ├── AdminUsers.jsx
│   └── AdminBorrows.jsx
└── utils/
    └── storage.js   # localStorage helpers and data seeding
```
