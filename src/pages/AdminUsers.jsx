import { useState } from 'react';
import { getUsers, saveUsers } from '../utils/storage';
import './AdminUsers.css';

export default function AdminUsers() {
  const [users, setUsers] = useState(() =>
    getUsers().filter((u) => u.role === 'student')
  );
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  function refresh() {
    setUsers(getUsers().filter((u) => u.role === 'student'));
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  function handleDelete(user) {
    if (!window.confirm(`Remove student "${user.name}"? This cannot be undone.`)) return;
    const all = getUsers();
    saveUsers(all.filter((u) => u.id !== user.id));
    showMsg(`User "${user.name}" removed.`);
    refresh();
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !search ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Users</h1>
        <p>View and manage registered students.</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="search-bar-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="results-count">{filtered.length} student{filtered.length !== 1 ? 's' : ''} registered</p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="no-data">No students found.</td></tr>
            ) : filtered.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>
                  <div className="user-cell">
                    <div className="user-initial">{u.name.charAt(0).toUpperCase()}</div>
                    <strong>{u.name}</strong>
                  </div>
                </td>
                <td>{u.email}</td>
                <td><span className="tag">{u.role}</span></td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn-delete" onClick={() => handleDelete(u)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
