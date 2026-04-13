import { useState } from 'react';
import { getBooks, getBorrows, getUsers } from '../utils/storage';
import './AdminReports.css';

function computeReports() {
  const books = getBooks();
  const borrows = getBorrows();
  const users = getUsers().filter((u) => u.role === 'student');
  const now = new Date();

  // Most popular books (by total borrows)
  const borrowCountMap = {};
  borrows.forEach((b) => {
    if (!borrowCountMap[b.bookId]) {
      borrowCountMap[b.bookId] = { bookTitle: b.bookTitle, count: 0 };
    }
    borrowCountMap[b.bookId].count += 1;
  });
  const popularBooks = Object.values(borrowCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Inventory status
  const inventory = books.map((b) => ({
    title: b.title,
    type: b.type || 'Book',
    genre: b.genre,
    copies: b.copies,
    available: b.available,
    issued: b.copies - b.available,
  }));

  // Overdue stats
  const overdueList = borrows.filter(
    (b) => b.status === 'borrowed' && new Date(b.dueAt) < now
  );
  const FINE_PER_DAY = 0.5;
  const totalFines = overdueList.reduce((sum, b) => {
    const days = Math.max(0, Math.floor((now - new Date(b.dueAt)) / 86400000));
    return sum + days * FINE_PER_DAY;
  }, 0);

  // Borrow activity by day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const borrowsByDay = Array(7).fill(0);
  borrows.forEach((b) => {
    const day = new Date(b.borrowedAt).getDay();
    borrowsByDay[day] += 1;
  });
  const peakDay = dayNames[borrowsByDay.indexOf(Math.max(...borrowsByDay))];

  // Resource type distribution
  const typeMap = {};
  books.forEach((b) => {
    const t = b.type || 'Book';
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeDistribution = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  // New registrations (last 30 days)
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const newRegistrations = users.filter(
    (u) => new Date(u.createdAt) > thirtyDaysAgo
  ).length;

  // Summary totals
  const totalBorrows = borrows.length;
  const activeBorrows = borrows.filter((b) => b.status === 'borrowed').length;
  const totalReturned = borrows.filter((b) => b.status === 'returned').length;
  const pendingApproval = borrows.filter((b) => b.status === 'pending_approval').length;

  return {
    popularBooks,
    inventory,
    overdueCount: overdueList.length,
    totalFines,
    borrowsByDay: dayNames.map((d, i) => ({ day: d, count: borrowsByDay[i] })),
    peakDay,
    typeDistribution,
    newRegistrations,
    totalBorrows,
    activeBorrows,
    totalReturned,
    pendingApproval,
    totalStudents: users.length,
    totalBooks: books.length,
  };
}

export default function AdminReports() {
  const [report] = useState(() => computeReports());
  const maxDayCount = Math.max(...report.borrowsByDay.map((d) => d.count), 1);
  const maxPopular = Math.max(...report.popularBooks.map((b) => b.count), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Library Reports</h1>
        <p>Analytics and insights to help with procurement and library management.</p>
      </div>

      {/* Summary cards */}
      <div className="report-stats-grid">
        {[
          { icon: '📚', value: report.totalBooks, label: 'Total Resources' },
          { icon: '👥', value: report.totalStudents, label: 'Students' },
          { icon: '📖', value: report.activeBorrows, label: 'Active Borrows' },
          { icon: '✅', value: report.totalReturned, label: 'Total Returned' },
          { icon: '⚠️', value: report.overdueCount, label: 'Overdue Items' },
          { icon: '💰', value: `$${report.totalFines.toFixed(2)}`, label: 'Outstanding Fines' },
          { icon: '🕐', value: report.pendingApproval, label: 'Pending Approval' },
          { icon: '🆕', value: report.newRegistrations, label: 'New Registrations (30d)' },
        ].map((s) => (
          <div key={s.label} className="report-stat-card">
            <span className="report-stat-icon">{s.icon}</span>
            <div className="report-stat-value">{s.value}</div>
            <div className="report-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="report-grid">
        {/* Most popular books */}
        <div className="report-panel">
          <h2>📈 Most Popular Resources</h2>
          {report.popularBooks.length === 0 ? (
            <p className="no-data">No borrow data yet.</p>
          ) : (
            <div className="bar-chart">
              {report.popularBooks.map((b) => (
                <div key={b.bookTitle} className="bar-row">
                  <span className="bar-label" title={b.bookTitle}>
                    {b.bookTitle.length > 28 ? b.bookTitle.slice(0, 28) + '…' : b.bookTitle}
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill-blue"
                      style={{ width: `${(b.count / maxPopular) * 100}%` }}
                    />
                  </div>
                  <span className="bar-count">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Borrowing by day of week */}
        <div className="report-panel">
          <h2>📅 Borrow Activity by Day</h2>
          <p className="report-hint">Peak day: <strong>{report.peakDay}</strong></p>
          <div className="bar-chart">
            {report.borrowsByDay.map((d) => (
              <div key={d.day} className="bar-row">
                <span className="bar-label">{d.day}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-green"
                    style={{ width: `${(d.count / maxDayCount) * 100}%` }}
                  />
                </div>
                <span className="bar-count">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resource type distribution */}
        <div className="report-panel">
          <h2>📦 Resource Type Distribution</h2>
          {report.typeDistribution.length === 0 ? (
            <p className="no-data">No resources yet.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr><th>Type</th><th>Count</th><th>Share</th></tr>
              </thead>
              <tbody>
                {report.typeDistribution.map((t) => (
                  <tr key={t.type}>
                    <td><span className="tag tag-type">{t.type}</span></td>
                    <td>{t.count}</td>
                    <td>{Math.round((t.count / report.totalBooks) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Overdue details */}
        <div className="report-panel">
          <h2>⚠️ Overdue Summary</h2>
          <div className="overdue-summary">
            <div className="overdue-stat">
              <span className="overdue-num">{report.overdueCount}</span>
              <span className="overdue-lbl">Items Overdue</span>
            </div>
            <div className="overdue-stat">
              <span className="overdue-num overdue-red">${report.totalFines.toFixed(2)}</span>
              <span className="overdue-lbl">Total Outstanding Fines</span>
            </div>
          </div>
          <p className="report-hint">Fine rate: $0.50 per day per overdue item.</p>
        </div>
      </div>

      {/* Full inventory status */}
      <div className="report-panel report-panel-full">
        <h2>🗄️ Inventory Status</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Genre</th>
                <th>Total Copies</th>
                <th>Issued</th>
                <th>Available</th>
                <th>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {report.inventory.length === 0 ? (
                <tr><td colSpan="8" className="no-data">No resources.</td></tr>
              ) : report.inventory.map((item, i) => {
                const utilPct = item.copies > 0
                  ? Math.round((item.issued / item.copies) * 100)
                  : 0;
                return (
                  <tr key={item.title}>
                    <td>{i + 1}</td>
                    <td><strong>{item.title}</strong></td>
                    <td><span className="tag tag-type">{item.type}</span></td>
                    <td><span className="tag">{item.genre}</span></td>
                    <td>{item.copies}</td>
                    <td>{item.issued}</td>
                    <td>
                      <span className={`badge ${item.available > 0 ? 'badge-available' : 'badge-unavailable'}`}>
                        {item.available}
                      </span>
                    </td>
                    <td>
                      <div className="util-bar-track">
                        <div
                          className="util-bar-fill"
                          style={{
                            width: `${utilPct}%`,
                            background: utilPct > 80 ? '#dc2626' : utilPct > 50 ? '#d97706' : '#16a34a',
                          }}
                        />
                      </div>
                      <span className="util-pct">{utilPct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
