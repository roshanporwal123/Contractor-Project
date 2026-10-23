import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';
import ReviewCard from '../components/ReviewCard';

// API response shape kuch bhi ho, array nikaal lo
const pickList = (data, key) => data?.[key] || data?.data || (Array.isArray(data) ? data : []);

export default function Reviews() {
    const { user } = useAuth();
//   const { user } = useContext(AuthContext);
  const isModerator = ['admin', 'company'].includes(user?.role);

  const [tab, setTab] = useState(isModerator ? 'moderation' : 'write');
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: '', reviewType: '' });

  const loadMine = useCallback(async () => {
    const { data } = await api.get('/reviews/mine');
    setMine(data.reviews);
  }, []);

  const loadModeration = useCallback(async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.reviewType) params.reviewType = filters.reviewType;
    const [list, st] = await Promise.all([api.get('/reviews', { params }), api.get('/reviews/stats')]);
    setAll(list.data.reviews);
    setStats(st.data);
  }, [filters]);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([api.get('/projects'), api.get('/contractors')]);
        setProjects(pickList(p.data, 'projects'));
        setContractors(pickList(c.data, 'contractors'));
      } catch (e) {
        console.error(e);
      }
      loadMine();
    })();
  }, [loadMine]);

  useEffect(() => {
    if (isModerator) loadModeration().catch(console.error);
  }, [isModerator, loadModeration]);

  const moderate = async (id, status) => {
    const moderationNote = status === 'rejected' ? window.prompt('Reject reason (optional):') || '' : '';
    await api.patch(`/reviews/${id}/moderate`, { status, moderationNote });
    loadModeration();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await api.delete(`/reviews/${id}`);
    loadMine();
    if (isModerator) loadModeration();
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{ padding: '8px 16px', marginRight: 8, fontWeight: tab === key ? 'bold' : 'normal' }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h2>Reviews & Ratings</h2>

      <div style={{ marginBottom: 20 }}>
        {tabBtn('write', 'Write Review')}
        {tabBtn('mine', 'My Reviews')}
        {isModerator && tabBtn('moderation', 'Moderation')}
      </div>

      {tab === 'write' && <ReviewForm projects={projects} contractors={contractors} onCreated={loadMine} />}

      {tab === 'mine' &&
        (mine.length ? (
          mine.map((r) => <ReviewCard key={r._id} review={r} showStatus onDelete={remove} />)
        ) : (
          <p>Abhi koi review nahi diya.</p>
        ))}

      {tab === 'moderation' && isModerator && (
        <>
          {stats && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                <b>Average</b>
                <div style={{ fontSize: 26 }}>{stats.overall.average} ★</div>
                <small>{stats.overall.count} approved</small>
              </div>
              {Object.entries(stats.byStatus).map(([k, v]) => (
                <div key={k} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                  <b style={{ textTransform: 'capitalize' }}>{k}</b>
                  <div style={{ fontSize: 26 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {stats?.topContractors?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4>Top Rated Contractors</h4>
              {stats.topContractors.map((t) => (
                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ minWidth: 160 }}>{t.contractor?.name || t.contractor?.fullName || 'Contractor'}</span>
                  <StarRating value={t.average} readOnly size={16} />
                  <small>{t.average} ({t.count})</small>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filters.reviewType} onChange={(e) => setFilters((f) => ({ ...f, reviewType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="project">Project</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          {all.length ? (
            all.map((r) => (
              <ReviewCard key={r._id} review={r} showStatus canModerate onModerate={moderate} onDelete={remove} />
            ))
          ) : (
            <p>Koi review nahi mila.</p>
          )}
        </>
      )}
    </div>
  );
}