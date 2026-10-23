import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import api from '../api/axios';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

const s = {
  page: { padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  value: { fontSize: 24, fontWeight: 700 },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginBottom: 20 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: (on) => ({
    padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer',
    background: on ? '#2563eb' : '#fff', color: on ? '#fff' : '#111827',
  }),
  btn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e5e7eb', color: '#374151' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f3f4f6' },
};

const Card = ({ label, value, sub, color }) => (
  <div style={s.card}>
    <div style={s.label}>{label}</div>
    <div style={{ ...s.value, color: color || '#111827' }}>{value}</div>
    {sub && <div style={s.sub}>{sub}</div>}
  </div>
);

const Bar100 = ({ pct, color = '#2563eb' }) => (
  <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, width: 90 }}>
    <div style={{ width: `${Math.min(pct || 0, 100)}%`, background: color, height: 8, borderRadius: 6 }} />
  </div>
);

export default function Dashboard() {
  const [tab, setTab] = useState('overview');
  const [months, setMonths] = useState(12);
  const [overview, setOverview] = useState(null);
  const [profit, setProfit] = useState(null);
  const [contractors, setContractors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (tab === 'overview') {
          const { data } = await api.get(`/dashboard?months=${months}`);
          setOverview(data.data);
        } else if (tab === 'profitability') {
          const { data } = await api.get('/dashboard/profitability');
          setProfit(data);
        } else {
          const { data } = await api.get('/dashboard/contractors');
          setContractors(data.data);
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Data load nahi hua');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab, months]);

  const download = async (type) => {
    const res = await api.get(`/dashboard/export/${type}?months=${months}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const c = overview?.cards;

  return (
    <div style={s.page}>
      <h2 style={{ marginTop: 0 }}>📊 Dashboard & Reports</h2>

      <div style={s.tabs}>
        {[['overview', 'Overview'], ['profitability', 'Project Profitability'], ['contractors', 'Contractor Performance']].map(
          ([k, l]) => (
            <button key={k} style={s.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
          )
        )}
      </div>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p>Loading...</p>}

      {/* ---------- OVERVIEW ---------- */}
      {tab === 'overview' && c && (
        <>
          <div style={s.grid}>
            <Card label="Active Projects" value={c.activeProjects} />
            <Card label="Completed Projects" value={c.completedProjects} color="#16a34a" />
            <Card label="Pending Tasks" value={c.pendingTasks} color="#f59e0b" />
            <Card label="Total Contractors" value={c.totalContractors} />
            <Card label="Revenue" value={money(c.revenue)} color="#16a34a" />
            <Card
              label="Outstanding Invoices"
              value={money(c.outstandingInvoices.amount)}
              sub={`${c.outstandingInvoices.count} invoices • ${c.overdueInvoices.count} overdue`}
              color="#dc2626"
            />
            <Card label="Expenses" value={money(c.expenses)} />
            <Card label="Net Profit" value={money(c.profit)} color={c.profit >= 0 ? '#16a34a' : '#dc2626'} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={s.btn}>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
            </select>
            <button style={s.btn} onClick={() => download('financial')}>⬇ Export CSV</button>
          </div>

          <div style={s.row}>
            <div style={s.card}>
              <div style={s.label}>Revenue vs Expenses</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overview.charts.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                  <Bar dataKey="expenses" fill="#dc2626" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={s.card}>
              <div style={s.label}>Profit Trend</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={overview.charts.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={s.row}>
            {[['Projects by Status', overview.charts.projectStatus], ['Tasks by Status', overview.charts.taskStatus]].map(
              ([title, data]) => (
                <div style={s.card} key={title}>
                  <div style={s.label}>{title}</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            )}
          </div>

          <div style={s.row}>
            <div style={s.card}>
              <div style={s.label}>⚠️ Overdue Invoices</div>
              {overview.overdueList.length === 0 ? (
                <p style={s.sub}>Koi overdue invoice nahi 🎉</p>
              ) : (
                <table style={s.table}>
                  <tbody>
                    {overview.overdueList.map((i) => (
                      <tr key={i._id}>
                        <td style={s.td}>{i.invoiceNumber}</td>
                        <td style={s.td}>{money(i.total)}</td>
                        <td style={s.td}>{new Date(i.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={s.card}>
              <div style={s.label}>Recent Projects</div>
              <table style={s.table}>
                <tbody>
                  {overview.recentProjects.map((p) => (
                    <tr key={p._id}>
                      <td style={s.td}>{p.name}</td>
                      <td style={s.td}>{p.status}</td>
                      <td style={s.td}><Bar100 pct={p.progress} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ---------- PROFITABILITY ---------- */}
      {tab === 'profitability' && profit && (
        <>
          <div style={s.grid}>
            <Card label="Total Revenue" value={money(profit.totals.revenue)} color="#16a34a" />
            <Card label="Total Expenses" value={money(profit.totals.expenses)} />
            <Card
              label="Total Profit"
              value={money(profit.totals.profit)}
              color={profit.totals.profit >= 0 ? '#16a34a' : '#dc2626'}
            />
          </div>
          <button style={{ ...s.btn, marginBottom: 14 }} onClick={() => download('profitability')}>⬇ Export CSV</button>

          <div style={{ ...s.card, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profit.data.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="revenue" fill="#16a34a" />
                <Bar dataKey="expenses" fill="#dc2626" />
                <Bar dataKey="profit" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...s.card, overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Project', 'Status', 'Budget', 'Revenue', 'Expenses', 'Profit', 'Margin', 'Budget Used'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profit.data.map((r) => (
                  <tr key={r.projectId}>
                    <td style={s.td}>{r.name}</td>
                    <td style={s.td}>{r.status}</td>
                    <td style={s.td}>{money(r.budget)}</td>
                    <td style={s.td}>{money(r.revenue)}</td>
                    <td style={s.td}>{money(r.expenses)}</td>
                    <td style={{ ...s.td, color: r.profit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {money(r.profit)}
                    </td>
                    <td style={s.td}>{r.margin}%</td>
                    <td style={s.td}>
                      <Bar100 pct={r.budgetUsed} color={r.budgetUsed > 100 ? '#dc2626' : '#2563eb'} />
                      <span style={s.sub}>{r.budgetUsed}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------- CONTRACTOR PERFORMANCE ---------- */}
      {tab === 'contractors' && contractors && (
        <>
          <button style={{ ...s.btn, marginBottom: 14 }} onClick={() => download('contractors')}>⬇ Export CSV</button>
          <div style={{ ...s.card, overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['#', 'Contractor', 'Status', 'Tasks', 'Completion', 'On-time', 'Hours', 'Rating', 'Score'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractors.map((r, i) => (
                  <tr key={r.contractorId}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}>{r.name}</td>
                    <td style={s.td}>{r.status}</td>
                    <td style={s.td}>{r.tasksCompleted}/{r.tasksAssigned}</td>
                    <td style={s.td}>{r.completionRate}%</td>
                    <td style={s.td}>{r.onTimeRate}%</td>
                    <td style={s.td}>{r.hoursWorked}</td>
                    <td style={s.td}>{r.reviews ? `⭐ ${r.avgRating} (${r.reviews})` : '—'}</td>
                    <td style={s.td}>
                      <Bar100 pct={r.score} color={r.score >= 70 ? '#16a34a' : r.score >= 40 ? '#f59e0b' : '#dc2626'} />
                      <span style={s.sub}>{r.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}