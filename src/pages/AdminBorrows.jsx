import { useState } from 'react';
import Swal from 'sweetalert2';
import { borrowsApi, holdsApi } from '../utils/api';
import { getBorrows, getHolds } from '../utils/storage';
import './AdminBorrows.css';

function loadAll() {
  return getBorrows().sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

const FINE_PER_DAY = 0.50;

function calcFine(b) {
  if (b.status !== 'borrowed' && b.status !== 'return_pending') return 0;
  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(b.dueAt)) / 86400000));
  return overdueDays * FINE_PER_DAY;
}

export default function AdminBorrows() {
  const [borrows, setBorrows] = useState(() => loadAll());
  const [holds, setHolds] = useState(() => getHolds());
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  function refresh() {
    setBorrows(loadAll());
    setHolds(getHolds());
  }

  function showMsg(text, type = 'success') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleApprove(borrow) {
    try {
      await borrowsApi.approve(borrow.id);
      showMsg(`Borrow approved for "${borrow.bookTitle}".`);
      refresh();
    } catch (err) {
      showMsg(err.message || 'Could not approve borrow.', 'error');
    }
  }

  async function handleReject(borrow) {
    const result = await Swal.fire({
      title: 'Reject Borrow Request?',
      text: `Reject borrow request for "${borrow.bookTitle}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, reject it',
    });
    if (!result.isConfirmed) return;
    await borrowsApi.reject(borrow.id);
    showMsg('Borrow request rejected.');
    refresh();
  }

  async function handleConfirmReturn(borrow) {
    const result = await Swal.fire({
      title: 'Confirm Return?',
      text: `Confirm that "${borrow.bookTitle}" has been physically returned by ${borrow.userName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, confirm return',
    });
    if (!result.isConfirmed) return;
    await borrowsApi.confirmReturn(borrow.id);
    Swal.fire({
      title: 'Return Confirmed!',
      text: `"${borrow.bookTitle}" has been marked as returned.`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
    });
    refresh();
  }

  async function handleRejectReturn(borrow) {
    const result = await Swal.fire({
      title: 'Reject Return Request?',
      text: `Reject the return request for "${borrow.bookTitle}" by ${borrow.userName}? The borrow will remain active.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, reject return',
    });
    if (!result.isConfirmed) return;
    await borrowsApi.rejectReturn(borrow.id);
    showMsg(`Return request for "${borrow.bookTitle}" rejected. Borrow remains active.`);
    refresh();
  }

  async function handleCancelHold(hold) {
    const result = await Swal.fire({
      title: 'Cancel Hold?',
      text: `Cancel hold for "${hold.bookTitle}" by ${hold.userName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel hold',
    });
    if (!result.isConfirmed) return;
    await holdsApi.cancel(hold.id);
    showMsg('Hold cancelled.');
    refresh();
  }

  const now = new Date();

  const pending = borrows.filter((b) => b.status === 'pending_approval');
  const active = borrows.filter((b) => b.status === 'borrowed');
  const returnRequests = borrows.filter((b) => b.status === 'return_pending');
  const overdue = borrows.filter((b) => b.status === 'borrowed' && new Date(b.dueAt) < now);
  const returned = borrows.filter((b) => b.status === 'returned');
  const rejected = borrows.filter((b) => b.status === 'rejected');
  const activeHolds = holds.filter((h) => h.status === 'pending');

  function applySearch(list) {
    const q = search.toLowerCase();
    return !search ? list : list.filter(
      (b) => b.bookTitle.toLowerCase().includes(q) || b.userName.toLowerCase().includes(q)
    );
  }

  const tabs = [
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'borrowed', label: `Active (${active.length})` },
    { key: 'return_requests', label: `Return Requests (${returnRequests.length})` },
    { key: 'overdue', label: `Overdue (${overdue.length})` },
    { key: 'returned', label: `Returned (${returned.length})` },
    { key: 'rejected', label: `Rejected (${rejected.length})` },
    { key: 'holds', label: `Holds Queue (${activeHolds.length})` },
  ];

  let displayList = [];
  if (activeTab === 'pending') displayList = applySearch(pending);
  else if (activeTab === 'borrowed') displayList = applySearch(active);
  else if (activeTab === 'return_requests') displayList = applySearch(returnRequests);
  else if (activeTab === 'overdue') displayList = applySearch(overdue);
  else if (activeTab === 'returned') displayList = applySearch(returned);
  else if (activeTab === 'rejected') displayList = applySearch(rejected);
  else if (activeTab === 'holds') displayList = applySearch(activeHolds);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Borrow Records</h1>
        <p>Approve borrow requests, monitor activity, manage holds queue.</p>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="filter-row">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search by book or student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-tabs" style={{ flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="results-count">{displayList.length} record{displayList.length !== 1 ? 's' : ''}</p>

      {activeTab === 'holds' ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Book</th>
                <th>Student</th>
                <th>Hold Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr><td colSpan="5" className="no-data">No active holds.</td></tr>
              ) : displayList.map((h, i) => (
                <tr key={h.id}>
                  <td>{i + 1}</td>
                  <td><strong>{h.bookTitle}</strong></td>
                  <td>{h.userName}</td>
                  <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-reject" onClick={() => handleCancelHold(h)}>Cancel Hold</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Book</th>
                <th>Student</th>
                <th>Requested On</th>
                <th>Due Date</th>
                <th>Return Requested</th>
                <th>Returned On</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr><td colSpan="10" className="no-data">No records found.</td></tr>
              ) : displayList.map((b, i) => {
                const isOverdue = (b.status === 'borrowed' || b.status === 'return_pending') && new Date(b.dueAt) < now;
                const fine = calcFine(b);
                const statusKey =
                  b.status === 'pending_approval' ? 'pending' :
                  b.status === 'return_pending' ? 'return-pending' :
                  b.status === 'rejected' ? 'rejected' :
                  b.status === 'borrowed' ? (isOverdue ? 'overdue' : 'borrowed') : 'returned';
                const statusLabel =
                  b.status === 'pending_approval' ? 'Pending' :
                  b.status === 'return_pending' ? 'Return Pending' :
                  b.status === 'rejected' ? 'Rejected' :
                  isOverdue ? 'Overdue' : b.status;
                return (
                  <tr key={b.id} className={isOverdue ? 'row-overdue' : ''}>
                    <td>{i + 1}</td>
                    <td><strong>{b.bookTitle}</strong></td>
                    <td>{b.userName}</td>
                    <td>{new Date(b.borrowedAt).toLocaleDateString()}</td>
                    <td className={isOverdue ? 'text-red' : ''}>
                      {b.dueAt ? new Date(b.dueAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {b.returnRequestedAt ? new Date(b.returnRequestedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '—'}</td>
                    <td className={fine > 0 ? 'text-red' : ''}>
                      {fine > 0 ? `$${fine.toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${statusKey}`}>{statusLabel}</span>
                    </td>
                    <td className="actions-cell">
                      {b.status === 'pending_approval' && (
                        <>
                          <button className="btn-approve" onClick={() => handleApprove(b)}>Approve</button>
                          <button className="btn-reject" onClick={() => handleReject(b)}>Reject</button>
                        </>
                      )}
                      {b.status === 'return_pending' && (
                        <>
                          <button className="btn-approve" onClick={() => handleConfirmReturn(b)}>Confirm Return</button>
                          <button className="btn-reject" onClick={() => handleRejectReturn(b)}>Reject Return</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
