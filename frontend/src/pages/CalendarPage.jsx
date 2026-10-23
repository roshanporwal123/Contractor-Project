import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api/axios';

const TYPE_COLORS = {
  site_visit: '#2563eb',
  appointment: '#7c3aed',
  meeting: '#0891b2',
  reminder: '#d97706',
  other: '#6b7280',
  project_start: '#16a34a',
  project_end: '#dc2626',
  task_deadline: '#ea580c',
  unavailable: '#9ca3af',
  leave: '#9ca3af',
};

const TYPE_LABELS = {
  site_visit: 'Site Visit',
  appointment: 'Appointment',
  meeting: 'Meeting',
  reminder: 'Reminder',
  other: 'Other',
};

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const cname = (c) => (c ? c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contractor' : '');

const emptyForm = () => {
  const s = new Date();
  s.setMinutes(0, 0, 0);
  s.setHours(s.getHours() + 1);
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  return {
    title: '',
    description: '',
    type: 'appointment',
    project: '',
    contractor: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    location: '',
    start: toLocalInput(s),
    end: toLocalInput(e),
    allDay: false,
    reminderMinutes: '60',
  };
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));
  const [filter, setFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [conflict, setConflict] = useState(null);
  const [error, setError] = useState('');

  const [avForm, setAvForm] = useState({
    contractor: '',
    status: 'unavailable',
    start: '',
    end: '',
    note: '',
  });

  // visible range (6 weeks grid)
  const gridDays = useMemo(() => {
    const first = new Date(cursor);
    const startOffset = first.getDay();
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      return new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    });
  }, [cursor]);

  const loadFeed = useCallback(async () => {
    const start = gridDays[0];
    const end = new Date(gridDays[41].getTime() + 24 * 3600 * 1000);
    try {
      const { data } = await api.get('/calendar/feed', {
        params: { start: start.toISOString(), end: end.toISOString() },
      });
      setItems(data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Calendar load nahi hua');
    }
  }, [gridDays]);

  const loadAvailability = useCallback(async () => {
    try {
      const start = new Date();
      const end = new Date(Date.now() + 90 * 24 * 3600 * 1000);
      const { data } = await api.get('/calendar/availability', {
        params: { start: start.toISOString(), end: end.toISOString() },
      });
      setAvailability(data.availability || []);
    } catch (_) {}
  }, []);

  const loadUpcoming = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar/upcoming', { params: { days: 7 } });
      setUpcoming(data.events || []);
    } catch (_) {}
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.get('/contractors'), api.get('/projects')]);
      setContractors(c.data.contractors || c.data.data || c.data || []);
      setProjects(p.data.projects || p.data.data || p.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    loadLookups();
    loadUpcoming();
    loadAvailability();
  }, [loadLookups, loadUpcoming, loadAvailability]);

  const itemsByDay = useMemo(() => {
    const map = {};
    items
      .filter((i) => {
        if (filter === 'all') return true;
        if (filter === 'events') return i.kind === 'event';
        return i.kind === filter;
      })
      .forEach((i) => {
        // multi-day items ko har din pe dikhao
        const s = new Date(i.start);
        const e = new Date(i.end);
        const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const last = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        let guard = 0;
        while (cur <= last && guard < 62) {
          const k = dayKey(cur);
          (map[k] = map[k] || []).push(i);
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
      });
    return map;
  }, [items, filter]);

  const openNew = (dateStr) => {
    const f = emptyForm();
    if (dateStr) {
      f.start = `${dateStr}T09:00`;
      f.end = `${dateStr}T10:00`;
    }
    setForm(f);
    setEditingId(null);
    setConflict(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    if (item.kind !== 'event') return;
    const e = item.raw;
    setForm({
      title: e.title,
      description: e.description || '',
      type: e.type,
      project: e.project?._id || e.project || '',
      contractor: e.contractor?._id || e.contractor || '',
      clientName: e.client?.name || '',
      clientEmail: e.client?.email || '',
      clientPhone: e.client?.phone || '',
      location: e.location || '',
      start: toLocalInput(e.start),
      end: toLocalInput(e.end),
      allDay: e.allDay,
      reminderMinutes: e.reminders?.[0] ? String(e.reminders[0].minutesBefore) : '',
    });
    setEditingId(e._id);
    setConflict(null);
    setError('');
    setShowModal(true);
  };

  const buildPayload = (force) => ({
    title: form.title,
    description: form.description,
    type: form.type,
    project: form.project || null,
    contractor: form.contractor || null,
    client: { name: form.clientName, email: form.clientEmail, phone: form.clientPhone },
    location: form.location,
    start: new Date(form.start).toISOString(),
    end: new Date(form.end).toISOString(),
    allDay: form.allDay,
    reminders: form.reminderMinutes !== '' ? [{ minutesBefore: Number(form.reminderMinutes) }] : [],
    force: !!force,
  });

  const save = async (force = false) => {
    setError('');
    try {
      if (editingId) await api.put(`/calendar/events/${editingId}`, buildPayload(force));
      else await api.post('/calendar/events', buildPayload(force));
      setShowModal(false);
      setConflict(null);
      loadFeed();
      loadUpcoming();
    } catch (e) {
      if (e.response?.status === 409) setConflict(e.response.data);
      else setError(e.response?.data?.message || 'Save nahi hua');
    }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/calendar/events/${id}/status`, { status });
    setShowModal(false);
    loadFeed();
    loadUpcoming();
  };

  const remove = async (id) => {
    if (!window.confirm('Ye event delete karna hai?')) return;
    await api.delete(`/calendar/events/${id}`);
    setShowModal(false);
    loadFeed();
    loadUpcoming();
  };

  const addAvailability = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/calendar/availability', {
        ...avForm,
        start: new Date(avForm.start).toISOString(),
        end: new Date(avForm.end).toISOString(),
      });
      setAvForm({ contractor: '', status: 'unavailable', start: '', end: '', note: '' });
      loadAvailability();
      loadFeed();
    } catch (err) {
      setError(err.response?.data?.message || 'Availability save nahi hui');
    }
  };

  const removeAvailability = async (id) => {
    await api.delete(`/calendar/availability/${id}`);
    loadAvailability();
    loadFeed();
  };

  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayKey = dayKey(new Date());
  const selectedItems = itemsByDay[selectedDay] || [];

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>Calendar & Scheduling</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Sab kuch</option>
            <option value="events">Sirf Events</option>
            <option value="project">Project dates</option>
            <option value="task">Task deadlines</option>
            <option value="availability">Contractor availability</option>
          </select>
          <button onClick={() => openNew(selectedDay)}>+ New Event</button>
        </div>
      </div>

      {error && !showModal && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>◀</button>
        <strong style={{ minWidth: 160, textAlign: 'center' }}>{monthLabel}</strong>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>▶</button>
        <button
          onClick={() => {
            const d = new Date();
            setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            setSelectedDay(dayKey(d));
          }}
        >
          Today
        </button>
      </div>

      {/* Month grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', border: '1px solid #e5e7eb' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} style={{ padding: 6, background: '#f3f4f6', fontWeight: 600, textAlign: 'center' }}>
              {d}
            </div>
          ))}
          {gridDays.map((d) => {
            const k = dayKey(d);
            const list = itemsByDay[k] || [];
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <div
                key={k}
                onClick={() => setSelectedDay(k)}
                onDoubleClick={() => openNew(k)}
                style={{
                  minHeight: 92,
                  padding: 4,
                  borderTop: '1px solid #e5e7eb',
                  borderLeft: '1px solid #e5e7eb',
                  background: k === selectedDay ? '#eff6ff' : inMonth ? '#fff' : '#fafafa',
                  opacity: inMonth ? 1 : 0.55,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: k === todayKey ? 700 : 400,
                    color: k === todayKey ? '#2563eb' : '#111',
                  }}
                >
                  {d.getDate()}
                </div>
                {list.slice(0, 3).map((i) => (
                  <div
                    key={i.id + k}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openEdit(i);
                    }}
                    title={i.title}
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      padding: '1px 4px',
                      borderRadius: 3,
                      color: '#fff',
                      background: TYPE_COLORS[i.type] || '#6b7280',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textDecoration: i.status === 'cancelled' ? 'line-through' : 'none',
                    }}
                  >
                    {i.title}
                  </div>
                ))}
                {list.length > 3 && <div style={{ fontSize: 11, color: '#555' }}>+{list.length - 3} aur</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      <div style={{ marginTop: 20 }}>
        <h3>{new Date(selectedDay).toDateString()}</h3>
        {selectedItems.length === 0 && <p>Is din kuch scheduled nahi hai.</p>}
        {selectedItems.map((i) => (
          <div
            key={i.id}
            style={{
              borderLeft: `4px solid ${TYPE_COLORS[i.type] || '#6b7280'}`,
              padding: '6px 10px',
              margin: '6px 0',
              background: '#f9fafb',
            }}
          >
            <strong>{i.title}</strong>{' '}
            {i.status && <small>({i.status})</small>}
            <div style={{ fontSize: 13 }}>
              {i.allDay
                ? 'All day'
                : `${new Date(i.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
                    i.end
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              {i.location ? ` • ${i.location}` : ''}
            </div>
            {i.kind === 'event' && (
              <button onClick={() => openEdit(i)} style={{ marginTop: 4 }}>
                Open / Edit
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Upcoming reminders */}
      <div style={{ marginTop: 24 }}>
        <h3>Upcoming (agle 7 din)</h3>
        {upcoming.length === 0 && <p>Koi upcoming event nahi.</p>}
        <ul>
          {upcoming.map((e) => (
            <li key={e._id}>
              {new Date(e.start).toLocaleString()} — <b>{e.title}</b> [{TYPE_LABELS[e.type]}]
              {e.contractor ? ` • ${cname(e.contractor)}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {/* Contractor availability */}
      <div style={{ marginTop: 24 }}>
        <h3>Contractor Availability</h3>
        <form onSubmit={addAvailability} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <select required value={avForm.contractor} onChange={(e) => setAvForm({ ...avForm, contractor: e.target.value })}>
            <option value="">Contractor chuno</option>
            {contractors.map((c) => (
              <option key={c._id} value={c._id}>
                {cname(c)}
              </option>
            ))}
          </select>
          <select value={avForm.status} onChange={(e) => setAvForm({ ...avForm, status: e.target.value })}>
            <option value="unavailable">Unavailable</option>
            <option value="leave">Leave</option>
            <option value="available">Available</option>
          </select>
          <input type="datetime-local" required value={avForm.start} onChange={(e) => setAvForm({ ...avForm, start: e.target.value })} />
          <input type="datetime-local" required value={avForm.end} onChange={(e) => setAvForm({ ...avForm, end: e.target.value })} />
          <input placeholder="Note" value={avForm.note} onChange={(e) => setAvForm({ ...avForm, note: e.target.value })} />
          <button type="submit">Add</button>
        </form>

        <ul>
          {availability.map((a) => (
            <li key={a._id}>
              {cname(a.contractor)} — <b>{a.status}</b> — {new Date(a.start).toLocaleString()} → {new Date(a.end).toLocaleString()}
              {a.note ? ` (${a.note})` : ''}{' '}
              <button onClick={() => removeAvailability(a._id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Event modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 'min(520px, 94vw)', maxHeight: '92vh', overflowY: 'auto' }}>
            <h3>{editingId ? 'Event Edit' : 'New Event'}</h3>
            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <div style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Title *" value={form.title} onChange={set('title')} />
              <select value={form.type} onChange={set('type')}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <label>
                Start <input type="datetime-local" value={form.start} onChange={set('start')} />
              </label>
              <label>
                End <input type="datetime-local" value={form.end} onChange={set('end')} />
              </label>
              <label>
                <input type="checkbox" checked={form.allDay} onChange={set('allDay')} /> All day
              </label>
              <select value={form.project} onChange={set('project')}>
                <option value="">Project (optional)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name || p.title}
                  </option>
                ))}
              </select>
              <select value={form.contractor} onChange={set('contractor')}>
                <option value="">Contractor (optional)</option>
                {contractors.map((c) => (
                  <option key={c._id} value={c._id}>
                    {cname(c)}
                  </option>
                ))}
              </select>
              <input placeholder="Location / Site address" value={form.location} onChange={set('location')} />
              <input placeholder="Client name" value={form.clientName} onChange={set('clientName')} />
              <input placeholder="Client email" value={form.clientEmail} onChange={set('clientEmail')} />
              <input placeholder="Client phone" value={form.clientPhone} onChange={set('clientPhone')} />
              <textarea placeholder="Description" rows={3} value={form.description} onChange={set('description')} />
              <select value={form.reminderMinutes} onChange={set('reminderMinutes')}>
                <option value="">Reminder nahi</option>
                <option value="15">15 min pehle</option>
                <option value="60">1 ghanta pehle</option>
                <option value="1440">1 din pehle</option>
              </select>
            </div>

            {conflict && (
              <div style={{ background: '#fef3c7', padding: 10, marginTop: 10, borderRadius: 6 }}>
                <b>{conflict.message}</b>
                <ul>
                  {conflict.conflicts.events.map((ev) => (
                    <li key={ev._id}>
                      Event: {ev.title} ({new Date(ev.start).toLocaleString()})
                    </li>
                  ))}
                  {conflict.conflicts.blocks.map((b) => (
                    <li key={b._id}>
                      {b.status}: {new Date(b.start).toLocaleDateString()} → {new Date(b.end).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
                <button onClick={() => save(true)}>Phir bhi save karo</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={() => save(false)}>Save</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
              {editingId && (
                <>
                  <button onClick={() => changeStatus(editingId, 'completed')}>Mark Completed</button>
                  <button onClick={() => changeStatus(editingId, 'cancelled')}>Cancel Event</button>
                  <button onClick={() => remove(editingId)} style={{ color: 'crimson' }}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}