import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { usersApi } from '../utils/api';
import { getUsers } from '../utils/storage';
import './AdminUsers.css';

const EMPTY_FORM = { name: '', email: '', password: '', studentId: '', phone: '' };

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const modalRef = useRef(null);

  function getStudents() {
    return getUsers().filter((u) => u.role === 'student');
  }

  const [users, setUsers] = useState(() => getStudents());

  function refresh() { setUsers(getStudents()); }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  // Show / hide Bootstrap modal imperatively
  useEffect(() => {
    if (!modalRef.current) return;
    const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modalRef.current);
    if (showForm) {
      bsModal?.show();
    } else {
      bsModal?.hide();
    }
  }, [showForm]);

  // Sync React state when modal is dismissed via close button / backdrop
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handler = () => setShowForm(false);
    el.addEventListener('hidden.bs.modal', handler);
    return () => el.removeEventListener('hidden.bs.modal', handler);
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(u) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: '', studentId: u.studentId || '', phone: u.phone || '' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const all = getUsers();
        const emailConflict = all.find((u) => u.email === form.email && u.id !== editingId);
        if (emailConflict) { showMsg('Email is already in use.', 'error'); return; }
        await usersApi.update(editingId, { name: form.name, email: form.email, studentId: form.studentId, phone: form.phone, password: form.password || undefined });
        showMsg('Student record updated.');
      } else {
        if (!form.password || form.password.length < 6) { showMsg('Password must be at least 6 characters.', 'error'); return; }
        await usersApi.create(form);
        showMsg('Student profile created successfully.');
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      showMsg(err.message || 'Operation failed.', 'error');
    }
  }

  async function handleVerify(u) {
    await usersApi.setStatus(u.id, 'active');
    showMsg(`${u.name}'s registration verified and account activated.`);
    refresh();
  }

  async function handleSuspend(u) {
    const result = await Swal.fire({
      title: 'Suspend Account?',
      text: `Suspend "${u.name}"? They will not be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, suspend',
    });
    if (!result.isConfirmed) return;
    await usersApi.setStatus(u.id, 'suspended');
    showMsg(`"${u.name}" suspended.`);
    refresh();
  }

  async function handleActivate(u) {
    await usersApi.setStatus(u.id, 'active');
    showMsg(`"${u.name}" account activated.`);
    refresh();
  }

  async function handleDelete(u) {
    const result = await Swal.fire({
      title: 'Remove Student?',
      text: `Permanently remove "${u.name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, remove',
    });
    if (!result.isConfirmed) return;
    await usersApi.remove(u.id);
    showMsg(`"${u.name}" removed.`);
    refresh();
  }

  const pending = users.filter((u) => (u.status || 'active') === 'pending');
  const active = users.filter((u) => (u.status || 'active') === 'active');
  const suspended = users.filter((u) => (u.status || 'active') === 'suspended');

  function filtered(list) {
    const q = search.toLowerCase();
    return !search ? list : list.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.studentId || '').toLowerCase().includes(q)
    );
  }

  const displayList = filtered(
    activeTab === 'pending' ? pending : activeTab === 'suspended' ? suspended : active
  );

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1>Manage Users</h1>
          <p>Create, edit, verify and manage student accounts.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Create Student</button>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="modal fade" id="userFormModal" tabIndex="-1" aria-labelledby="userFormModalLabel" aria-hidden="true" ref={modalRef}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="userFormModalLabel">{editingId ? 'Edit Student Record' : 'Create Student Profile'}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <form id="userForm" onSubmit={handleSubmit} className="book-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" name="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Student ID</label>
                      <input name="studentId" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="e.g. STU-2024-001" />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{editingId ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingId ? 'Leave blank to keep current' : 'Min. 6 characters'}
                      required={!editingId}
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" form="userForm" className="btn btn-primary">{editingId ? 'Update Record' : 'Create Profile'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tabs-row">
        {[
          { key: 'active', label: `Active (${active.length})` },
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'suspended', label: `Suspended (${suspended.length})` },
        ].map((t) => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="search-bar-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by name, email or student ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="results-count">{displayList.length} student{displayList.length !== 1 ? 's' : ''}</p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr><td colSpan="8" className="no-data">No students found.</td></tr>
            ) : displayList.map((u, i) => {
              const status = u.status || 'active';
              return (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-initial">{u.name.charAt(0).toUpperCase()}</div>
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td className="mono">{u.studentId || '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge badge-status-${status}`}>{status}</span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => openEdit(u)}>Edit</button>
                    {status === 'pending' && (
                      <button className="btn-verify" onClick={() => handleVerify(u)}>Verify</button>
                    )}
                    {status === 'active' && (
                      <button className="btn-suspend" onClick={() => handleSuspend(u)}>Suspend</button>
                    )}
                    {status === 'suspended' && (
                      <button className="btn-activate" onClick={() => handleActivate(u)}>Activate</button>
                    )}
                    <button className="btn-delete" onClick={() => handleDelete(u)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
