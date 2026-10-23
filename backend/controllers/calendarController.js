import mongoose from 'mongoose';
import CalendarEvent from '../models/CalendarEvent.js';
import Availability from '../models/Availability.js';

const parseRange = (q) => {
  const start = q.start ? new Date(q.start) : new Date();
  const end = q.end ? new Date(q.end) : new Date(Date.now() + 31 * 24 * 3600 * 1000);
  return { start, end };
};

// Conflict check: contractor ke paas same time pe event ya unavailable block hai ya nahi
const findConflicts = async ({ companyId, contractor, start, end, excludeId }) => {
  if (!contractor) return { events: [], blocks: [] };

  const eventQuery = {
    company: companyId,
    contractor,
    status: { $ne: 'cancelled' },
    start: { $lt: end },
    end: { $gt: start },
  };
  if (excludeId) eventQuery._id = { $ne: excludeId };

  const events = await CalendarEvent.find(eventQuery).select('title start end');
  const blocks = await Availability.find({
    company: companyId,
    contractor,
    status: { $in: ['unavailable', 'leave'] },
    start: { $lt: end },
    end: { $gt: start },
  }).select('status start end note');

  return { events, blocks };
};

const validateTimes = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 'Valid start aur end date do';
  if (e <= s) return 'End time start time ke baad hona chahiye';
  return null;
};

// ---------- EVENTS ----------

export const createEvent = async (req, res) => {
  try {
    const { title, start, end, contractor, force } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required hai' });

    const err = validateTimes(start, end);
    if (err) return res.status(400).json({ message: err });

    const conflicts = await findConflicts({
      companyId: req.companyId,
      contractor: contractor || null,
      start: new Date(start),
      end: new Date(end),
    });

    if ((conflicts.events.length || conflicts.blocks.length) && !force) {
      return res.status(409).json({
        message: 'Contractor us time pe available nahi hai',
        conflicts,
      });
    }

    const body = { ...req.body };
    delete body.force;
    delete body.company;
    if (!body.project) body.project = null;
    if (!body.contractor) body.contractor = null;

    const event = await CalendarEvent.create({
      ...body,
      company: req.companyId,
      createdBy: req.user._id,
    });

    res.status(201).json({ event });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const q = { company: req.companyId, start: { $lt: end }, end: { $gt: start } };
    if (req.query.type) q.type = req.query.type;
    if (req.query.status) q.status = req.query.status;
    if (req.query.contractor) q.contractor = req.query.contractor;
    if (req.query.project) q.project = req.query.project;

    const events = await CalendarEvent.find(q)
      .populate('project')
      .populate('contractor')
      .sort({ start: 1 });

    res.json({ events });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ _id: req.params.id, company: req.companyId })
      .populate('project')
      .populate('contractor');
    if (!event) return res.status(404).json({ message: 'Event nahi mila' });
    res.json({ event });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({ _id: req.params.id, company: req.companyId });
    if (!event) return res.status(404).json({ message: 'Event nahi mila' });

    const { force } = req.body;
    const body = { ...req.body };
    delete body.force;
    delete body.company;
    delete body._id;

    const start = body.start ? new Date(body.start) : event.start;
    const end = body.end ? new Date(body.end) : event.end;
    const err = validateTimes(start, end);
    if (err) return res.status(400).json({ message: err });

    const contractor = body.contractor !== undefined ? body.contractor || null : event.contractor;

    const conflicts = await findConflicts({
      companyId: req.companyId,
      contractor,
      start,
      end,
      excludeId: event._id,
    });
    if ((conflicts.events.length || conflicts.blocks.length) && !force) {
      return res.status(409).json({ message: 'Contractor us time pe available nahi hai', conflicts });
    }

    // time change hua to reminders dobara chalne chahiye
    const timeChanged =
      start.getTime() !== event.start.getTime() || end.getTime() !== event.end.getTime();

    if (body.project === '') body.project = null;
    if (body.contractor === '') body.contractor = null;

    Object.assign(event, body);
    if (timeChanged) event.reminders.forEach((r) => (r.sent = false));
    await event.save();

    res.json({ event });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event nahi mila' });
    res.json({ event });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!event) return res.status(404).json({ message: 'Event nahi mila' });
    res.json({ message: 'Event delete ho gaya' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ---------- AVAILABILITY ----------

export const setAvailability = async (req, res) => {
  try {
    const { contractor, status, start, end, note } = req.body;
    if (!contractor) return res.status(400).json({ message: 'Contractor required hai' });
    const err = validateTimes(start, end);
    if (err) return res.status(400).json({ message: err });

    const item = await Availability.create({
      company: req.companyId,
      contractor,
      status: status || 'unavailable',
      start,
      end,
      note,
    });
    res.status(201).json({ availability: item });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getAvailability = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const q = { company: req.companyId, start: { $lt: end }, end: { $gt: start } };
    if (req.query.contractor) q.contractor = req.query.contractor;

    const items = await Availability.find(q).populate('contractor').sort({ start: 1 });
    res.json({ availability: items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteAvailability = async (req, res) => {
  try {
    const item = await Availability.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!item) return res.status(404).json({ message: 'Entry nahi mili' });
    res.json({ message: 'Availability entry delete ho gayi' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const checkAvailability = async (req, res) => {
  try {
    const { contractor, start, end } = req.query;
    if (!contractor || !start || !end) {
      return res.status(400).json({ message: 'contractor, start, end required hain' });
    }
    const conflicts = await findConflicts({
      companyId: req.companyId,
      contractor,
      start: new Date(start),
      end: new Date(end),
    });
    res.json({
      available: !conflicts.events.length && !conflicts.blocks.length,
      conflicts,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ---------- COMBINED FEED (calendar view ke liye) ----------
// Events + Project dates + Task deadlines + Availability blocks

export const getCalendarFeed = async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const companyId = req.companyId;
    const items = [];

    const events = await CalendarEvent.find({
      company: companyId,
      start: { $lt: end },
      end: { $gt: start },
    })
      .populate('project')
      .populate('contractor');

    events.forEach((e) =>
      items.push({
        id: String(e._id),
        kind: 'event',
        type: e.type,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        status: e.status,
        location: e.location,
        raw: e,
      })
    );

    // Project start/end (agar Project model registered hai)
    const Project = mongoose.models.Project;
    if (Project) {
      try {
        const projects = await Project.find({
          company: companyId,
          $or: [
            { startDate: { $gte: start, $lt: end } },
            { endDate: { $gte: start, $lt: end } },
          ],
        });
        projects.forEach((p) => {
          const name = p.name || p.title || 'Project';
          if (p.startDate && p.startDate >= start && p.startDate < end) {
            items.push({
              id: `ps-${p._id}`,
              kind: 'project',
              type: 'project_start',
              title: `Start: ${name}`,
              start: p.startDate,
              end: p.startDate,
              allDay: true,
            });
          }
          if (p.endDate && p.endDate >= start && p.endDate < end) {
            items.push({
              id: `pe-${p._id}`,
              kind: 'project',
              type: 'project_end',
              title: `Deadline: ${name}`,
              start: p.endDate,
              end: p.endDate,
              allDay: true,
            });
          }
        });
      } catch (_) {
        /* Project schema alag ho to calendar tootna nahi chahiye */
      }
    }

    // Task deadlines (agar Task model registered hai)
    const Task = mongoose.models.Task;
    if (Task) {
      try {
        const tasks = await Task.find({
          company: companyId,
          dueDate: { $gte: start, $lt: end },
        });
        tasks.forEach((t) =>
          items.push({
            id: `t-${t._id}`,
            kind: 'task',
            type: 'task_deadline',
            title: `Task: ${t.title || t.name || 'Task'}`,
            start: t.dueDate,
            end: t.dueDate,
            allDay: true,
            status: t.status,
          })
        );
      } catch (_) {}
    }

    // Contractor unavailable / leave blocks
    const blocks = await Availability.find({
      company: companyId,
      status: { $in: ['unavailable', 'leave'] },
      start: { $lt: end },
      end: { $gt: start },
    }).populate('contractor');

    blocks.forEach((b) => {
      const c = b.contractor || {};
      const cname = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contractor';
      items.push({
        id: `av-${b._id}`,
        kind: 'availability',
        type: b.status,
        title: `${cname} - ${b.status === 'leave' ? 'Leave' : 'Unavailable'}`,
        start: b.start,
        end: b.end,
        allDay: true,
      });
    });

    items.sort((a, b) => new Date(a.start) - new Date(b.start));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Upcoming reminders (dashboard / bell icon ke liye)
export const getUpcoming = async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 3600 * 1000);

    const events = await CalendarEvent.find({
      company: req.companyId,
      status: 'scheduled',
      start: { $gte: now, $lte: until },
    })
      .populate('project')
      .populate('contractor')
      .sort({ start: 1 })
      .limit(50);

    res.json({ events });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};