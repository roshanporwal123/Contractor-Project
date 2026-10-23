import { useState } from 'react';
import api from '../api/axios';
import StarRating from './StarRating';

export default function ReviewForm({ projects = [], contractors = [], onCreated }) {
  const [form, setForm] = useState({
    reviewType: 'project',
    projectId: '',
    contractorId: '',
    rating: 0,
    title: '',
    comment: '',
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!form.projectId) return setMsg('Project select karo');
    if (form.reviewType === 'contractor' && !form.contractorId) return setMsg('Contractor select karo');
    if (!form.rating) return setMsg('Rating do');

    try {
      setLoading(true);
      const payload = { ...form };
      if (payload.reviewType === 'project') delete payload.contractorId;
      const { data } = await api.post('/reviews', payload);
      setMsg(data.message);
      setForm((f) => ({ ...f, rating: 0, title: '', comment: '' }));
      onCreated && onCreated();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const box = { display: 'block', width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' };

  return (
    <form onSubmit={submit} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <h3 style={{ marginTop: 0 }}>Write a Review</h3>

      <select style={box} value={form.reviewType} onChange={(e) => set('reviewType', e.target.value)}>
        <option value="project">Project Rating</option>
        <option value="contractor">Contractor Rating</option>
      </select>

      <select style={box} value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>

      {form.reviewType === 'contractor' && (
        <select style={box} value={form.contractorId} onChange={(e) => set('contractorId', e.target.value)}>
          <option value="">-- Select Contractor --</option>
          {contractors.map((c) => (
            <option key={c._id} value={c._id}>{c.name || c.fullName || c.email}</option>
          ))}
        </select>
      )}

      <div style={{ marginBottom: 10 }}>
        <StarRating value={form.rating} onChange={(v) => set('rating', v)} size={30} />
      </div>

      <input style={box} placeholder="Title (optional)" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} />
      <textarea style={box} rows={4} placeholder="Apna experience likho..." value={form.comment} onChange={(e) => set('comment', e.target.value)} maxLength={1500} />

      <button type="submit" disabled={loading} style={{ padding: '8px 18px' }}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </form>
  );
}