const Event = require('../models/event');
const EventLog = require('../models/eventLog');
const { parseLocalToUTC, utcToLocalString } = require('../utils/time');
const { createEventSchema, updateEventSchema, listEventsQuerySchema } = require('../validations/event_validation');

async function createEvent(req, res) {
  try {
    const user = req.user;
    const payload = await createEventSchema.validateAsync(req.body, { abortEarly: false });

    const startAtUTC = parseLocalToUTC(payload.startLocal, payload.eventTimezone);
    const endAtUTC = parseLocalToUTC(payload.endLocal, payload.eventTimezone);

    if (endAtUTC <= startAtUTC) {
      return res.status(400).json({ error: 'End must be after start' });
    }

    const nowUTC = new Date();
    if (endAtUTC <= nowUTC) {
      return res.status(400).json({ error: 'End must not be in the past' });
    }

    const event = await Event.create({
      users: payload.users,
      eventTimezone: payload.eventTimezone,
      startAtUTC,
      endAtUTC,
      createdBy: user.userId
    });

    return res.status(201).json({ id: event._id });
  } catch (err) {
    if (err && err.isJoi) {
      const details = err.details ? err.details.map(d => ({ message: d.message, path: d.path })) : [];
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error('createEvent error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function listEventsForUser(req, res) {
  try {
    const rawQuery = { ...req.query };
    if (rawQuery.userId !== undefined) {
      const raw = rawQuery.userId;

      if (Array.isArray(raw)) {
        rawQuery.userId = raw;
      } else if (typeof raw === 'string') {
        let parsed;
        if (/^\s*\[/.test(raw)) {
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = null;
          }
        }
        if (!parsed && raw.includes(',')) {
          parsed = raw.split(',').map(s => s.trim()).filter(Boolean);
        }
        rawQuery.userId = parsed && Array.isArray(parsed) && parsed.length ? parsed : raw.trim();
      }
    }

    const queryValues = await listEventsQuerySchema.validateAsync(rawQuery, { abortEarly: false });
    let { userId, viewerTimezone } = queryValues;

    const userIds = Array.isArray(userId) ? userId : [userId];

    const query = { users: { $in: userIds } };

    const events = await Event.find(query)
      .sort({ startAtUTC: 1 })
      .lean()
      .populate('users');

    // Accept any timezone string from client
    const tz = viewerTimezone || 'UTC';
    const transformed = events.map(e => ({
      ...e,
      startLocal: utcToLocalString(e.startAtUTC, tz),
      endLocal: utcToLocalString(e.endAtUTC, tz),
      createdAtLocal: utcToLocalString(e.createdAt, tz),
      updatedAtLocal: utcToLocalString(e.updatedAt, tz)
    }));

    return res.json({ events: transformed });
  } catch (err) {
    if (err && err.isJoi) {
      const details = err.details ? err.details.map(d => ({ message: d.message, path: d.path })) : [];
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error('listEventsForUser error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const viewerTimezone = req.query.viewerTimezone;

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid event id' });
    }

    const event = await Event.findById(id)
      .lean()
      .populate({ path: 'users', select: 'name' });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    const viewer = req.user;
    if (!viewer || !viewer.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const isAdmin = !!viewer.isAdmin;
    const viewerIdStr = String(viewer.userId);
    const isParticipant = Array.isArray(event.users) && event.users.some(u => String(u._id || u) === viewerIdStr);

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, error: 'Forbidden: access denied to this event' });
    }

    const result = { ...event };
    if (viewerTimezone && typeof viewerTimezone === 'string') {
      try {
        result.startLocal = utcToLocalString(event.startAtUTC, viewerTimezone);
        result.endLocal = utcToLocalString(event.endAtUTC, viewerTimezone);
        result.createdAtLocal = utcToLocalString(event.createdAt, viewerTimezone);
        result.updatedAtLocal = utcToLocalString(event.updatedAt, viewerTimezone);
      } catch (e) {
        console.warn('timezone conversion failed for getEventById:', e && e.message);
      }
    }

    return res.status(200).json({ success: true, event: result });
  } catch (err) {
    console.error('getEventById error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

async function getEventLogs(req, res) {
  try {
    const { id } = req.params;
    const viewerTimezone = req.query.viewerTimezone;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid event id' });
    }

    const viewer = req.user;
    if (!viewer || !viewer.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const event = await Event.findById(id).select('users').lean();
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = !!viewer.isAdmin;
    const viewerIdStr = String(viewer.userId);
    const isParticipant = Array.isArray(event.users) && event.users.some(u => String(u._id || u) === viewerIdStr);

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, error: 'Forbidden: access denied to event logs' });
    }
    const [logs, total] = await Promise.all([
      EventLog.find({ event: id })
        .sort({ timestampUTC: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'changedBy', select: 'name' })
        .lean(),
      EventLog.countDocuments({ event: id })
    ]);

    const formatValue = (val) => {
      if (!val) return val;
      if (val instanceof Date) {
        return {
          utc: val.toISOString(),
          local: viewerTimezone ? utcToLocalString(val, viewerTimezone) : val.toISOString()
        };
      }
      if (val && typeof val === 'object' && val.$date) {
        const d = new Date(val.$date);
        return {
          utc: d.toISOString(),
          local: viewerTimezone ? utcToLocalString(d, viewerTimezone) : d.toISOString()
        };
      }
      if (Array.isArray(val)) return val.map(v => (typeof v === 'object' && v && (v.$oid || v._id)) ? String(v.$oid || v._id || v) : String(v));
      return val;
    };

    const formatted = logs.map(l => ({
      _id: l._id,
      event: String(l.event),
      changedBy: l.changedBy ? { _id: String(l.changedBy._id), name: l.changedBy.name } : null,
      changes: (l.changes || []).map(ch => ({
        field: ch.field,
        before: formatValue(ch.before),
        after: formatValue(ch.after)
      })),
      timestampUTC: {
        utc: l.timestampUTC ? new Date(l.timestampUTC).toISOString() : null,
        local: l.timestampUTC && viewerTimezone ? utcToLocalString(l.timestampUTC, viewerTimezone) : (l.timestampUTC ? new Date(l.timestampUTC).toISOString() : null)
      }
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    if (err && err.isJoi) {
      const details = err.details ? err.details.map(d => ({ message: d.message, path: d.path })) : [];
      return res.status(400).json({ success: false, error: 'Validation failed', details });
    }
    console.error('getEventLogs error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const payload = await updateEventSchema.validateAsync(req.body, { abortEarly: false });
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: 'not found' });

    const changes = [];

    if (payload.startLocal || payload.endLocal || payload.eventTimezone) {
      const tz = payload.eventTimezone || event.eventTimezone;
      if (payload.startLocal) {
        const newStartUTC = parseLocalToUTC(payload.startLocal, tz);
        changes.push({ field: 'startAtUTC', before: event.startAtUTC, after: newStartUTC });
        event.startAtUTC = newStartUTC;
      }
      if (payload.endLocal) {
        const newEndUTC = parseLocalToUTC(payload.endLocal, tz);
        changes.push({ field: 'endAtUTC', before: event.endAtUTC, after: newEndUTC });
        event.endAtUTC = newEndUTC;
      }
      if (payload.eventTimezone && payload.eventTimezone !== event.eventTimezone) {
        changes.push({ field: 'eventTimezone', before: event.eventTimezone, after: payload.eventTimezone });
        event.eventTimezone = payload.eventTimezone;
      }
    }

    if (payload.users) {
      changes.push({ field: 'users', before: event.users, after: payload.users });
      event.users = payload.users;
    }

    await event.save();

    if (changes.length > 0) {
      await EventLog.create({
        event: event._id,
        changedBy: req.user.userId,
        changes,
        timestampUTC: new Date()
      });
    }

    return res.json({ id: event._id });
  } catch (err) {
    if (err && err.isJoi) {
      const details = err.details ? err.details.map(d => ({ message: d.message, path: d.path })) : [];
      return res.status(400).json({ error: 'Validation failed', details });
    }
    console.error('updateEvent error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { createEvent, listEventsForUser, updateEvent, getEventLogs, getEventById };